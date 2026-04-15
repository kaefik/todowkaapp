# План улучшения системы уведомлений

**Дата:** 14 апреля 2026
**Основание:** `docs/plans/3 итерация/2026-04-14-notification-analyze.md`
**Статус:** К реализации

---

## Архитектурные решения

| Решение | Выбор |
|---------|-------|
| SSE механизм | Event-driven через asyncio pub/sub (вместо polling каждую секунду) |
| Обновления на фронте | Только SSE, polling убрать |
| Авторизация SSE | Cookie-based (httpOnly cookie с access_token) |
| Дублирование SSE | NotificationProvider на уровне App (один экземпляр) |
| Тесты | Средний уровень (~30-40 тестов) |
| Rate limiting | До 3 SSE-соединений на пользователя |

---

## ~~Этап 1~~ — Backend: Event Bus (инфраструктура) ✅ ВЫПОЛНЕН

### 1.1 Создать `backend/app/event_bus.py` ✅

**Файл создан:** `backend/app/event_bus.py`

Реализован EventBus с:
- `subscribe(user_id)` → asyncio.Queue с maxlen=10
- `unsubscribe(user_id, queue)` — удаление подписки
- `publish(user_id, event_type, data)` — отправка во все очереди пользователя
- `get_subscriber_count(user_id)` — для rate limiting
- `cleanup_user(user_id)` — удаление всех подписок
- Singleton: `event_bus = EventBus()`

### 1.2 Интегрировать EventBus в scheduler ✅

**Файл изменён:** `backend/app/scheduler.py`

В `_job_send_due_reminders()` после успешного `send_reminder()` и `commit()`:
```python
from app.event_bus import event_bus
await event_bus.publish(str(user.id), "notification_created", {
    "notification_id": str(notification.id),
    "type": notification.type,
    "message": notification.message,
    "task_id": str(task.id) if task.id else None,
})
```

**Тестирование пройдено:** импорт, subscribe/unsubscribe/publish, queue full handling, cleanup

---

## ~~Этап 2~~ — Backend: Cookie-based авторизация для SSE ✅ ВЫПОЛНЕН

### 2.1 Устанавливать access_token cookie при логине ✅

**Файл:** `backend/app/security.py`

Добавить функции:
- `set_access_cookie(response, token)` — httpOnly cookie `access_token` на путь `/api/sse`, SameSite=strict, Secure
- `clear_access_cookie(response)` — удалить cookie

**Файл:** `backend/app/api/auth.py`

- В `login()` (строка 97): добавить `set_access_cookie(response, access_token)` после `set_refresh_cookie`
- В `refresh()` (строка 128): добавить `set_access_cookie(response, access_token)`
- В `logout()` (строка 199): добавить `clear_access_cookie(response)`

Параметры cookie:
```
key="access_token"
path="/api/sse"       # доступна только SSE-эндпоинтам
httponly=True
secure=True
samesite="strict"
max_age=settings.access_token_expire_minutes * 60
```

### 2.2 Создать SSE-зависимость для авторизации через cookie ✅

**Файл:** `backend/app/dependencies.py`

Добавить:
```python
async def get_current_user_from_cookie(
    access_token: Annotated[str | None, Cookie()] = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> User:
```

Логика:
1. Сначала попробовать cookie `access_token` (для SSE)
2. Затем Authorization header (для обычных запросов — backward compatible)
3. Декодировать JWT, найти пользователя
4. Вернуть 401 если не валиден

### 2.3 Обновить SSE-эндпоинт ✅

**Файл:** `backend/app/api/sse.py`

Заменить `Depends(get_current_user)` на `Depends(get_current_user_from_cookie)` в SSE-роутах.

---

## Этап 3 — Backend: Переписать SSE на event-driven ✅ ВЫПОЛНЕН

### 3.1 Переписать `GET /sse/notifications` ✅

**Файл:** `backend/app/api/sse.py`

Реализовано:
- Event-driven генератор через EventBus (вместо polling с DB-запросами каждую секунду)
- Раздельные каналы: `{user_id}:notifications` и `{user_id}:sync`
- Rate limiting (максимум 3 SSE-соединения на канал)
- Heartbeat каждые 30с через `asyncio.wait_for(queue.get(), timeout=30)`
- Автоматическая отписка в `finally` блоке
- Нет DB-сессии внутри генератора (нет утечки)

**Дополнительно исправлено:**
- SSE-роутер подключён через `api_router` (раньше напрямую к `app`), теперь SSE доступен на `/api/sse/...`
- Cookie path `/api/sse` теперь корректно совпадает с реальным путём SSE

### 3.2 Обновить `GET /sse/sync` ✅

**Файл:** `backend/app/api/sse.py`

Реализовано аналогично notifications — event-driven через канал `{user_id}:sync`.

**Файл:** `backend/app/api/tasks.py`

Добавлена функция `_publish_task_event()` — публикует `task_updated` события в EventBus при:
- `create_task` (action: "created")
- `update_task` (action: "updated")
- `move_task` (action: "moved")
- `reorder_task` (action: "reordered")
- `toggle_task` (action: "toggled")
- `delete_task` (action: "deleted")
- `create_subtask` (action: "subtask_created")
- `stop_task_recurrence` (action: "recurrence_stopped")

**Файл:** `backend/app/scheduler.py`

Обновлён channel для публикации: `f"{user.id}:notifications"` (вместо `str(user.id)`)

### 3.3 Убрать зависимость SSE от DB-сессии ✅

SSE-эндпоинты больше не принимают `db: AsyncSession = Depends(get_db)`.
Авторизация через `get_current_user_from_cookie` (DB-сессия создаётся внутри зависимости и закрывается после разрешения).
Сам event_generator не использует DB.

**Файл:** `frontend/src/hooks/useSSE.ts`

Обновлены URL: `/sse/...` → `/api/sse/...` (для совместимости с новым маршрутом).

---

## Этап 4 — Backend: Исправление критических багов

### 4.1 Устранить двойной commit в scheduler ✅ ВЫПОЛНЕНО

**Файл:** `backend/app/services/reminder_service.py`

В `send_reminder()` (строка 68-96):
- Заменить `await self.db.commit()` на `await self.db.flush()`
- `flush()` запишет в БД без commit — данные доступны по ID, но транзакция не завершена

**Файл:** `backend/app/scheduler.py`

В `_job_send_due_reminders()` (строка 93-127):
- Один `await db.commit()` в конце цикла обработки всех задач
- В `except`: `await db.rollback()` откатит всё, включая `last_reminder_sent_at` — это правильно, т.к. уведомление не создано

### 4.2 Оптимизировать `find_due_tasks()` — фильтрация в SQL ✅ ВЫПОЛНЕНО

**Файл:** `backend/app/services/reminder_service.py`

Перенести проверку `should_send_reminder()` в SQL-запрос:

```python
result = await self.db.execute(
    select(Task).options(selectinload(Task.user))
    .where(
        Task.due_date.isnot(None),
        Task.is_completed == False,
        or_(
            Task.last_reminder_sent_at.is_(None),
            Task.last_reminder_sent_at <= datetime.now(UTC) - timedelta(hours=24),
        )
    )
)
```

Фильтрацию по `reminder_time` / `reminder_offsets` оставить в Python (она требует timezone-преобразований, которые сложны в SQL для SQLite).

### 4.3 Исправить `cleanup_expired_notifications()` ✅ ВЫПОЛНЕНО

**Файл:** `backend/app/services/reminder_service.py` (строка 200-210)

Заменить:
```python
cutoff_date = datetime.now(ZoneInfo('UTC')) - timedelta(days=days)
```
на:
```python
now = datetime.now(ZoneInfo('UTC'))
delete(Notification).where(Notification.expires_at < now)
```

Уведомления удаляются когда `expires_at` прошёл (30 дней после создания), а не `expires_at` + ещё 30 дней.

### 4.4 Оптимизировать `mark_all_as_read()` — bulk update ✅ ВЫПОЛНЕНО

**Файл:** `backend/app/services/reminder_service.py` (строка 158-175)

Заменить цикл с загрузкой в память на:
```python
from sqlalchemy import update

stmt = (
    update(Notification)
    .where(Notification.user_id == user_id, Notification.is_read == False)
    .values(is_read=True, read_at=datetime.now(UTC))
)
result = await self.db.execute(stmt)
return result.rowcount
```

---

## ~~Этап 5~~ — Backend: Индексы и валидация ✅ ВЫПОЛНЕН

### 5.1 Добавить миграцию с индексами на notifications ✅

**Файл создан:** `backend/alembic/versions/20260415_0944_add_notification_indexes_a32a2291d1c4.py`

Индексы:
- `ix_notifications_user_read` на `(user_id, is_read)` — для списка непрочитанных ✅
- `ix_notifications_user_created` на `(user_id, created_at)` — для сортировки по дате ✅
- `ix_notifications_expires` на `(expires_at)` — для cleanup ✅

Миграция применена успешно. Индексы созданы в БД.

### 5.2 Валидация UUID в API ✅

**Файл:** `backend/app/api/notifications.py`

- Добавлен импорт `UUID` из `uuid` ✅
- Изменен тип параметра `notification_id` с `str` на `UUID` в:
  - `mark_notification_as_read()` (строка 61) ✅
  - `delete_notification()` (строка 110) ✅

FastAPI автоматически валидирует формат UUID и возвращает 422 при некорректном значении. Проверено тестами.

### 5.3 Убрать избыточный `selectinload(Notification.task)` ✅

**Файл:** `backend/app/api/notifications.py`

- Удален `selectinload(Notification.task)` из запроса списка (строка 48) ✅
- Удален неиспользуемый импорт `selectinload` ✅

`NotificationResponse` требует только `task_id` (доступен как FK-столбец), поэтому JOIN не нужен. Проверено тестом - список уведомлений работает корректно.

---

## ~~Этап 6~~ — Frontend: NotificationProvider (singleton SSE) ✅ ВЫПОЛНЕН

### ~~6.1~~ Создать Zustand-стор для уведомлений ✅ ВЫПОЛНЕНО

**Файл создан:** `frontend/src/stores/notificationStore.ts`

Реализован Zustand-стор с:
- Состояние: `notifications`, `total`, `unreadCount`, `isLoading`, `error`, `sseState`
- Actions: `refetch()`, `markAsRead()`, `markAllAsRead()`, `deleteNotification()`, `startSSE()`, `stopSSE()`
- Интеграция с `sseManager` для SSE-подключения
- Автоматическое обновление при получении SSE-события

### ~~6.2~~ Создать SSE-менеджер ✅ ВЫПОЛНЕНО

**Файл создан:** `frontend/src/services/sseManager.ts`

Реализован singleton-класс `SSEManager` с:
- `connect(userId, callbacks)` — создание EventSource к `/api/sse/notifications`
- Cookie `access_token` отправляется браузером автоматически (httpOnly)
- `onMessage` callback при получении события `notification`
- `onStateChange` callback для отслеживания состояния соединения
- `onError` callback при ошибках
- Exponential backoff (1с → 30с макс) при переподключении
- `disconnect()` — закрытие EventSource
- Singleton: `export const sseManager = new SSEManager()`

### ~~6.3~~ Создать NotificationProvider ✅ ВЫПОЛНЕНО

**Файл создан:** `frontend/src/components/NotificationProvider.tsx`

Реализован React-компонент-обёртка:
- Подписывается на `useAuthStore` — при логине запускает SSE, при логауте — останавливает
- Вызывает `refetch()` при получении SSE-события
- Рендерит children без обёртки (нет DOM-элемента)

### ~~6.4~~ Интегрировать NotificationProvider в App ✅ ВЫПОЛНЕНО

**Файл изменён:** `frontend/src/main.tsx`

Приложение обёрнуто в `<NotificationProvider>` внутри `AuthInitializer`.

### ~~6.5~~ Обновить NotificationBell ✅ ВЫПОЛНЕНО

**Файл изменён:** `frontend/src/components/NotificationBell.tsx`

- Заменён `useNotifications()` на `useNotificationStore()` с селекторами
- Убран polling (`setInterval` каждые 30с)
- Убран импорт `notifyNotificationsChanged`
- Компонент только отображает данные, не управляет подписками

### ~~6.6~~ Обновить Notifications-страницу ✅ ВЫПОЛНЕНО

**Файл изменён:** `frontend/src/routes/Notifications.tsx`

- Заменён `useNotifications()` на `useNotificationStore()` с селекторами
- Все API-вызовы делегированы store

### ~~6.7~~ Удалить устаревшие файлы ✅ ВЫПОЛНЕНО

Удалены:
- `frontend/src/hooks/useSSE.ts` — заменён на `sseManager.ts`
- `frontend/src/hooks/useNotifications.ts` — заменён на `notificationStore.ts`

---

## ~~Этап 7~~ — Frontend: Рефакторинг утилит ✅ ВЫПОЛНЕН

### ~~7.1~~ Вынести `formatTime()` и `typeIcon()` в утилиты ✅

**Файл создан:** `frontend/src/utils/notificationUtils.tsx`

Перенесены из `NotificationBell.tsx` (строки 59-101) и `Notifications.tsx` (строки 50-92):
- `formatTime(dateStr: string): string` — форматирует дату в относительное время
- `typeIcon(type: string, size: string = 'md'): ReactNode` — возвращает иконку для типа уведомления

Обновлены оба компонента:
- `NotificationBell.tsx` — импортирует из `utils/notificationUtils.tsx`, использует `typeIcon(notification.type, 'sm')`
- `Notifications.tsx` — импортирует из `utils/notificationUtils.tsx`, использует `typeIcon(notification.type)` (по умолчанию 'md')

**Проверено:**
- Линтер проходит без ошибок (1 несвязанное предупреждение)
- TypeScript проверка типов прошла успешно

---

## Этап 8 — Тесты

### 8.1 Backend: `tests/test_notifications_api.py` (~15 тестов)

```
test_list_notifications_empty
test_list_notifications_with_data
test_list_notifications_unread_only
test_list_notifications_pagination
test_mark_notification_as_read
test_mark_notification_as_read_not_found
test_mark_notification_as_read_wrong_user
test_mark_all_as_read
test_delete_notification
test_delete_notification_not_found
test_delete_notification_wrong_user
```

### 8.2 Backend: `tests/test_reminder_service.py` (~15 тестов)

```
test_find_due_tasks_with_reminder_time
test_find_due_tasks_with_reminder_offsets
test_find_due_tasks_skips_completed
test_find_due_tasks_skips_no_due_date
test_send_reminder_creates_notification
test_send_reminder_updates_last_sent_at
test_should_send_reminder_first_time
test_should_send_reminder_within_24h
test_should_send_reminder_after_24h
test_mark_all_as_read_bulk
test_cleanup_expired_notifications
test_cleanup_does_not_remove_active
```

### 8.3 Backend: `tests/test_sse.py` (~8 тестов)

```
test_sse_notifications_requires_auth
test_sse_notifications_receives_event
test_sse_rate_limit_max_3_connections
test_sse_heartbeat_sent
test_sse_disconnect_cleans_up
```

---

## Порядок реализации

| Шаг | Этап | Зависимости | Оценка |
|-----|-------|-------------|--------|
| 1 | 1.1-1.2 | Нет | 1 ч |
| 2 | 4.1 | Нет | 0.5 ч |
| 3 | 4.2 | Нет | 0.5 ч |
| 4 | 4.3-4.4 | Нет | 0.5 ч |
| 5 | 2.1-2.3 | Шаг 1 | 1.5 ч |
| 6 | 3.1-3.3 | Шаг 2, 5 | 2 ч |
| 7 | 5.1-5.3 | Нет | 0.5 ч |
| 8 | 6.1-6.7 | Шаг 6 | 2.5 ч |
| 9 | 7.1 | Шаг 8 | 0.5 ч |
| 10 | 8.1-8.3 | Шаг 7 | 2.5 ч |
| | **Итого** | | **~12 ч** |

---

## Зависимости файлов по этапам

### Backend-изменения

| Файл | Этап | Что меняется |
|------|-------|-------------|
| `app/event_bus.py` | 1 | **Новый** — pub/sub на asyncio.Queue |
| `app/security.py` | 2 | Добавить `set_access_cookie()`, `clear_access_cookie()` |
| `app/dependencies.py` | 2 | Добавить `get_current_user_from_cookie()` |
| `app/api/auth.py` | 2 | Вызывать `set_access_cookie` / `clear_access_cookie` |
| `app/api/sse.py` | 3 | Переписать на event-driven + cookie auth |
| `app/services/reminder_service.py` | 4 | Исправить commit/flush, SQL-фильтрация, cleanup, bulk update |
| `app/scheduler.py` | 1,4 | Публиковать события в EventBus, один commit |
| `app/api/notifications.py` | 5 | UUID валидация, убрать selectinload |
| `app/models/notification.py` | 5 | Добавить индексы через миграцию |
| `alembic/versions/...` | 5 | **Новый** — миграция индексов |

### Frontend-изменения

| Файл | Этап | Что меняется |
|------|-------|-------------|
| `src/stores/notificationStore.ts` | 6 | **Новый** — Zustand-стор уведомлений |
| `src/services/sseManager.ts` | 6 | **Новый** — singleton SSE-менеджер |
| `src/components/NotificationProvider.tsx` | 6 | **Новый** — React-провайдер |
| `src/main.tsx` | 6 | Обернуть в NotificationProvider |
| `src/components/NotificationBell.tsx` | 6,7 | Использовать store, убрать polling, вынести утилиты |
| `src/routes/Notifications.tsx` | 6,7 | Использовать store, вынести утилиты |
| `src/utils/notificationUtils.ts` | 7 | **Новый** — formatTime, typeIcon |
| `src/hooks/useSSE.ts` | 6 | **Удалить** |
| `src/hooks/useNotifications.ts` | 6 | **Удалить** |

### Backend-тесты

| Файл | Этап |
|------|-------|
| `tests/test_notifications_api.py` | 8 | **Новый** |
| `tests/test_reminder_service.py` | 8 | **Новый** |
| `tests/test_sse.py` | 8 | **Новый** |

---

## Риски и.mitigation

| Риск | Вероятность | Решение |
|------|------------|---------|
| Cookie не отправляется на SSE (CORS) | Среднее | Настроить `credentials: 'include'` на EventSource; SameSite cookie с правильным доменом |
| Queue переполняется если SSE-клиент медленный | Низкое | `maxlen=10` на Queue — старые события теряются, но при следующем refetch они подтянутся |
| При перезапуске сервера все SSE-соединения разрываются | Низкое | Frontend автоматически переподключается (exponential backoff в sseManager) |
| SQLite блокировки при большом количестве concurrent writes | Среднее | WAL mode уже включён; cleanup/reminder — короткие транзакции |
| Access token cookie (15 мин) — SSE переподключение при истечении | Среднее | SSE переподключится, но получит 401 → frontend делает refresh, получает новый cookie, переподключается |
