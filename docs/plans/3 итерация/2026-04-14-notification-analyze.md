# Глубокий анализ системы уведомлений Todowka

**Дата:** 14 апреля 2026 года
**Статус:** Обнаружены критические проблемы

---

## Архитектура

Система состоит из двух подсистем:
1. **Напоминания (Reminders)** — APScheduler каждую минуту ищет задачи с наступившим временем, создает уведомления в БД
2. **Уведомления (Notifications)** — CRUD + real-time доставка через SSE polling

---

## 1. ПРОБЛЕМЫ БЕЗОПАСНОСТИ

### 1.1 SSE — утечка данных через удержание сессии (КРИТИЧЕСКОЕ)
**Файл:** `backend/app/api/sse.py:23-63`

SSE-эндпоинт `/sse/notifications` передаёт `db: AsyncSession` через Depends, но генератор работает **бесконечно**. Сессия БД живёт пока соединение открыто, что при множестве пользователей создаст пул висящих соединений к SQLite. При SQLite это особенно критично — блокировка WAL может исчерпаться.

### 1.2 SSE не передаёт токен авторизации
**Файл:** `frontend/src/hooks/useSSE.ts:73-75`

```typescript
const url = new URL('/sse/notifications', window.location.origin)
const eventSource = new EventSource(url.toString())
```

`EventSource` не поддерживает передачу `Authorization` заголовка. Сервер при этом использует `Depends(get_current_user)` через HTTPBearer. Это **может не работать** в некоторых браузерах/конфигурациях — SSE-запрос не содержит заголовок Authorization, сервер вернёт 401, но `sse_starlette` может не корректно это обработать. Нужно проверять — возможно SSE работает только из-за того, что cookie или другой механизм пробрасывает авторизацию.

**Решение:** передавать токен через query parameter (`/sse/notifications?token=...`) или использовать cookie-based auth.

### 1.3 Отсутствие rate limiting на SSE
SSE-эндпоинты не имеют rate limiting. Злоумышленник может открыть сотни SSE-соединений и исчерпать ресурсы сервера.

### 1.4 Отсутствие индексов на notifications
**Файл:** `backend/app/models/notification.py`

Нет индексов на `(user_id, is_read)`, `(user_id, created_at)`, `expires_at`. При росте числа уведомлений запросы в `sse.py:33-36` и `notifications.py:28-56` будут деградировать.

### 1.5 UUID передаётся как String(36)
**Файл:** `backend/app/api/notifications.py:61`

`notification_id: str` — нет валидации формата UUID. Можно передать произвольную строку (SQL injection не возможна через SQLAlchemy, но это плохая практика).

---

## 2. ПРОБЛЕМЫ СРАБАТЫВАНИЯ УВЕДОМЛЕНИЙ

### 2.1 Двойной commit — потеря уведомлений (КРИТИЧЕСКОЕ)
**Файл:** `reminder_service.py:94` + `scheduler.py:119`

```
send_reminder() → commit()  // первый commit
scheduler → commit()          // второй commit (после rollback в except — может откатить)
```

Если между двумя коммитами происходит ошибка, `last_reminder_sent_at` установлен, а уведомление потеряно. Это уже подтверждено в отчёте тестирования: 2 задачи имеют `last_reminder_sent_at` без уведомлений.

### 2.2 find_due_tasks() загружает ВСЕ незавершённые задачи в память
**Файл:** `reminder_service.py:20-33`

```python
result = await self.db.execute(
    select(Task).options(selectinload(Task.user))
    .where(Task.due_date.isnot(None), Task.is_completed == False)
)
tasks = list(result.scalars().all())
```

Фильтрация по времени напоминания делается **в Python**, не в SQL. При 10 000 задач это будет загрузка всех в память + N итераций. Должно быть SQL-условие.

### 2.3 should_send_reminder() проверяет 24 часа — но find_due_tasks() не вызывает его
**Файл:** `scheduler.py:109`

`should_send_reminder()` вызывается в scheduler, но `find_due_tasks()` уже вернул задачу как "due". Это значит задача может попадать в `due_tasks` каждый цикл (каждую минуту), и только потом фильтроваться через 24-часовую проверку. Для `reminder_offsets` это работает корректно (break после первого match), но для `reminder_time` задача будет обрабатываться каждую минуту пока `should_send_reminder` не заблокирует.

### 2.4 reminder_offsets: несколько offset'ов — создаётся только одно уведомление
**Файл:** `reminder_service.py:52-61`

Для `reminder_offsets` цикл проходит все offset'ы, но `break` после первого попавшего. Если у задачи offsets `[5, 15, 60]` и наступило время для 60 мин — уведомление будет одно, но не будет для 15 мин и 5 мин (они уже прошли). Это может быть ожидаемым поведением, но неочевидно.

### 2.5 SSE polling каждую 1 секунду — уведомление может быть пропущено
**Файл:** `sse.py:36`

```python
.where(Notification.created_at >= datetime.now(UTC).replace(microsecond=0) - timedelta(seconds=1))
```

Окно в 1 секунду. Если SSE-цикл немного задержался (GC, нагрузка), уведомление с `created_at` вне окна будет потеряно. `sent_notifications` отслеживает уже отправленные, но только в рамках жизни одного соединения.

### 2.6 SSE reconnect — потеря уведомлений при переподключении
При переподключении SSE (frontend `useSSE.ts:106-110`) `sent_notifications` сбрасывается. Все уведомления, созданные в момент отключения, не будут доставлены через SSE (только при следующем refetch через polling 30с).

### 2.7 Дублирование SSE-событий + polling = избыточные запросы
**Файл:** `NotificationBell.tsx:37-41` + `useNotifications.ts:54-59` + `useNotifications.ts:64-81`

Уведомления обновляются через:
1. SSE событие → refetch()
2. CustomEvent `todowka:notifications-changed` → refetch()
3. setInterval каждые 30с → `notifyNotificationsChanged()` → refetch()
4. При mount → refetch()

Это **3 параллельных механизма**, дублирующих друг друга. Если SSE работает — polling каждые 30с избыточен.

---

## 3. УЗКИЕ МЕСТА И ВОЗМОЖНОСТИ УЛУЧШЕНИЯ

### 3.1 SSE polling — не настоящий push
**Файл:** `sse.py:29-61`

Текущая реализация SSE — это **polling через SSE**: сервер каждую секунду делает SQL-запрос и отправляет результат. Это хуже чем обычный HTTP polling, потому что:
- Постоянное SSE-соединение держит сессию БД
- Каждый цикл = SQL запрос
- Нет benefit от SSE (который должен быть event-driven)

**Решение:** Использовать in-process event bus (например, `asyncio.Event` или pub/sub через dict). Scheduler после создания уведомления публикует событие → SSE-генератор ждёт его через `asyncio.wait()`.

### 3.2 selectinload(Notification.task) — избыточный JOIN
**Файл:** `notifications.py:48`, `reminder_service.py:131`

Для списка уведомлений подгружается связанная задача через `selectinload`. Для dropdown'а в NotificationBell нужны только последние 5 — task не нужен, только `task_id` для навигации.

### 3.3 mark_all_as_read — загрузка всех в память
**Файл:** `reminder_service.py:158-175`

```python
notifications = list(result.scalars().all())
for notification in notifications:
    notification.is_read = True
```

Загружает N уведомлений в память чтобы обновить их по одному. Нужно использовать `update()` statement (как уже сделано в `api/notifications.py:95-103` — API уже делает правильно, а сервис нет).

### 3.4 cleanup_expired_notifications — сравнивает expires_at с cutoff_date
**Файл:** `reminder_service.py:200-210`

```python
cutoff_date = datetime.now(ZoneInfo('UTC')) - timedelta(days=days)
delete(Notification).where(Notification.expires_at < cutoff_date)
```

Это удаляет уведомления, чей `expires_at` + 30 дней уже прошли. Логика правильная, но условие должно быть `Notification.expires_at < now()` (удалять просроченные), а не `< cutoff_date`. Текущая формула: expired < (now - 30d) — т.е. уведомления живут 30 + 30 = 60 дней.

### 3.5 Frontend: duplicate formatTime() и typeIcon()
**Файл:** `NotificationBell.tsx:62-103` и `Notifications.tsx:52-94`

Одинаковые функции форматирования и иконок дублируются в двух компонентах. Нужно вынести в общие утилиты.

### 3.6 Frontend: NotificationBell вызывает useNotifications() — каждый экземпляр отдельно
**Файл:** `AppLayout.tsx:177,209` + `NotificationBell.tsx:10`

NotificationBell рендерится в двух местах (мобильный + десктоп). Каждый создаёт свой SSE subscription и polling interval. Два параллельных SSE-соединения к одному endpoint.

---

## 4. ТЕСТЫ — АНАЛИЗ

### 4.1 Бэкенд-тесты уведомлений: ПОЛНОСТЬЮ ОТСУТСТВУЮТ
В `backend/tests/` нет ни одного тестового файла для:
- CRUD уведомлений (GET/PATCH/DELETE)
- SSE-эндпоинтов
- ReminderService (find_due_tasks, send_reminder, should_send_reminder)
- Scheduler (_job_send_due_reminders)
- cleanup_expired_notifications

Существующие тесты (`test_tasks.py`, `test_auth.py` и т.д.) не покрывают reminder-поля задач.

### 4.2 Фронтенд-тесты уведомлений: ОТСУТСТВУЮТ
Нет тестов для:
- useNotifications hook
- useSSE hook
- NotificationBell component
- ReminderEditor component
- Notifications page

### 4.3 Интеграционное/ручное тестирование
Есть документация в `docs/plans/3 итерация/тестирование-этап-6-уведомления.md` — инструкции для ручного тестирования, но нет автоматизированных тестов.

---

## 5. СВОДНАЯ ТАБЛИЦА ПРОБЛЕМ

| # | Серьёзность | Категория | Проблема | Файл |
|---|------------|-----------|----------|------|
| 1 | КРИТИЧЕСКОЕ | Срабатывание | Двойной commit → потеря уведомлений | `scheduler.py:119` + `reminder_service.py:94` |
| 2 | КРИТИЧЕСКОЕ | Срабатывание | SSE polling с окном 1с — пропуск уведомлений | `sse.py:36` |
| 3 | ВЫСОКОЕ | Безопасность | SSE без авторизации (EventSource не отправляет заголовки) | `useSSE.ts:75` |
| 4 | ВЫСОКОЕ | Безопасность | Нет rate limiting на SSE | `sse.py` |
| 5 | ВЫСОКОЕ | Производительность | find_due_tasks загружает все задачи в Python | `reminder_service.py:20-33` |
| 6 | ВЫСОКОЕ | Производительность | SSE держит DB-сессию бесконечно | `sse.py:23-26` |
| 7 | ВЫСОКОЕ | Тестирование | 0 автоматических тестов для уведомлений | `backend/tests/` |
| 8 | СРЕДНЕЕ | Срабатывание | Тройной механизм обновления (SSE + event + polling) | `NotificationBell.tsx` + `useNotifications.ts` |
| 9 | СРЕДНЕЕ | Срабатывание | cleanup: уведомления живут 60 дней вместо 30 | `reminder_service.py:203` |
| 10 | СРЕДНЕЕ | Производительность | Два SSE-подключения (NotificationBell x 2) | `AppLayout.tsx` |
| 11 | СРЕДНЕЕ | Производительность | selectinload(task) при list — избыточно | `notifications.py:48` |
| 12 | НИЗКОЕ | Код | Дублирование formatTime/typeIcon | `NotificationBell.tsx` + `Notifications.tsx` |
| 13 | НИЗКОЕ | Безопасность | Нет валидации UUID на notification_id | `notifications.py:61` |
| 14 | НИЗКОЕ | Производительность | Нет индексов на notifications | `notification.py` |

---

## 6. ПРИОРИТЕТНЫЕ РЕКОМЕНДАЦИИ

1. **Убрать двойной commit** — `send_reminder()` должен делать `flush()`, а `scheduler` — один `commit()` в конце цикла
2. **Переписать SSE на event-driven** — pub/sub через `asyncio.Event` вместо polling каждую секунду
3. **Добавить авторизацию для SSE** — токен через query param
4. **Написать тесты** — минимум: test_notifications_api, test_reminder_service, test_scheduler_jobs
5. **Оптимизировать find_due_tasks()** — перенести фильтрацию по времени в SQL
6. **Вынести SSE-подписку на уровень выше** — один экземпляр вместо двух в NotificationBell
7. **Убрать дублирование polling** — если SSE работает, убрать 30с interval из NotificationBell

---

## 7. СВЯЗАННЫЕ ФАЙЛЫ

### Backend
- `backend/app/models/notification.py` — модель Notification
- `backend/app/models/task.py` — поля reminder_time, reminder_offsets
- `backend/app/schemas/notification.py` — Pydantic-схемы
- `backend/app/services/reminder_service.py` — бизнес-логика напоминаний
- `backend/app/api/notifications.py` — REST API уведомлений
- `backend/app/api/sse.py` — SSE-эндпоинты
- `backend/app/scheduler.py` — APScheduler задачи

### Frontend
- `frontend/src/api/notifications.ts` — API клиент
- `frontend/src/hooks/useSSE.ts` — SSE-подключения
- `frontend/src/hooks/useNotifications.ts` — хук уведомлений
- `frontend/src/components/NotificationBell.tsx` — колокольчик
- `frontend/src/components/ReminderEditor.tsx` — редактор напоминаний
- `frontend/src/routes/Notifications.tsx` — страница уведомлений
- `frontend/src/components/AppLayout.tsx` — layout (2 экземпляра NotificationBell)

### Тесты
- `backend/tests/` — тесты уведомлений ОТСУТСТВУЮТ

### Документация
- `docs/plans/3 итерация/отчет-тестирование-напоминаний.md` — предыдущий отчёт
- `docs/plans/3 итерация/тестирование-этап-6-уведомления.md` — инструкции ручного тестирования
