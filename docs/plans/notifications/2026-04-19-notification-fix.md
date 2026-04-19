# План исправления системы напоминаний

**Дата анализа:** 2026-04-19
**Статус:** Не начат

---

## Архитектура системы напоминаний

```
Scheduler (каждые 1 мин)
  → ReminderService.find_due_tasks() — загрузка ВСЕХ задач в память
    → перебор Python-кодом
      → send_reminder() — создание Notification в БД
        → EventBus.publish() — in-process pub/sub
          → SSE endpoint — push по HTTP
            → sseManager (frontend) — прием SSE
              → notificationStore — обновление стора
                → browserNotifications — показ browser notification
```

---

## КРИТИЧЕСКИЕ БАГИ

### БАГ-1: Множественные `reminder_offsets` не работают — сработает только один

**Файл:** `backend/app/services/reminder_service.py:55-71`
**Серьезность:** Критический
**Симптом:** Из выбранных `[5, 60, 1440]` всегда срабатывает только самый маленький оффсет

**Причина:**
- Первый оффсет (5 мин) срабатывает нормально
- `last_reminder_sent_at` устанавливается в `now()` (момент отправки)
- При проверке второго оффсета (60 мин): `calculated_reminder_dt = due_date - 60min`
- Проверка `calculated_reminder_dt > last_sent` = `(due_date - 60min) > (due_date - 5min + 1s)` = **FALSE**
- Второй и последующие оффсеты НИКОГДА не сработают

**Код:**
```python
# reminder_service.py:55-71
elif task.reminder_offsets:
    for offset_minutes in task.reminder_offsets:
        calculated_reminder_dt = due_date - timedelta(minutes=offset_minutes)
        if now_utc >= calculated_reminder_dt:
            last_sent = task.last_reminder_sent_at
            if not last_sent or calculated_reminder_dt > last_sent:
                reminder_dt = calculated_reminder_dt
                due_tasks.append(task)
                break  # <-- прерывает цикл после первого совпадения
    continue
```

**Решение:**
- Заменить `last_reminder_sent_at` на `sent_reminder_offsets` (JSON-множество отправленных оффсетов)
- Проверять каждый оффсет индивидуально: если его нет в `sent_reminder_offsets` и время прошло — отправить
- Каждый оффсет отслеживается независимо

---

### БАГ-2: `reminder_time` — баг сравнения таймзон при клэмпинге

**Файл:** `backend/app/services/reminder_service.py:48-50`
**Серьезность:** Критический
**Симптом:** В таймзонах с отрицательным UTC (западнее Гринвича) напоминания могут сработать после дедлайна

**Причина:**
Сравнивается `task.reminder_time` (naive time, предполагается локальное время пользователя) с `due_date.time()` (UTC время):

```python
if due_date.time() != time(0, 0) and task.reminder_time > due_date.time():
    reminder_time_to_use = time(due_date_local.hour, due_date_local.minute)
```

**Пример для UTC-5:**
- Задача due: `15:00 UTC` = `10:00 local`
- Напоминание: `12:00 local`
- Проверка: `12:00 > 15:00` = **FALSE** — клэмпинг не срабатывает
- Напоминание в 12:00 local, хотя due уже в 10:00 local

**Решение:**
- Сравнивать `task.reminder_time` с `due_date_local.time()` (оба в локальной таймзоне):
```python
if due_date_local.time() != time(0, 0) and task.reminder_time > due_date_local.time():
    reminder_time_to_use = time(due_date_local.hour, due_date_local.minute)
```

---

### БАГ-3: Нет восстановления пропущенных напоминаний при перезапуске сервера

**Файл:** `backend/app/scheduler.py:160-187`
**Серьезность:** Критический
**Симптом:** Напоминания не приходят после перезапуска сервера

**Причина:**
`_job_startup_recovery` обрабатывает только рекуррентные задачи. Напоминания, которые должны были сработать во время даунтайма:
- Для `reminder_time`: может сработать с опозданием (если `last_reminder_sent_at` не был установлен)
- Для `reminder_offsets`: если `last_reminder_sent_at` уже был установлен для другого оффсета — не сработает вообще

**Решение:**
- Добавить `_job_reminder_recovery` при старте: искать задачи с `due_date > now() - 24h` и не отправленными напоминаниями
- Отправлять все просроченные напоминания с пометкой `delivered_late=True`

---

### БАГ-4: SSE лимит в 5 попыток — необратимое отключение

**Файл:** `frontend/src/services/sseManager.ts:158-166`
**Серьезность:** Критический
**Симптом:** После моргания Wi-Fi все уведомления перестают приходить в реальном времени

**Причина:**
```typescript
if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
    // Навсегда прекращает попытки реконнекта
    this.setState('error')
    return
}
```

Восстановление только через:
- `BACKEND_RECOVERED` (health checker с интервалом до 120 сек)
- Событие `online`/`offline` браузера
- Перезагрузку страницы

**Решение:**
- Убрать хардкодный лимит 5 попыток
- Использовать бесконечный реконнект с бэкоффом: 1s → 2s → 4s → ... → 30s (cap)
- Сбрасывать счетчик при успешном `BACKEND_RECOVERED`
- Добавить periodic polling (каждые 30-60 сек) как fallback при недоступности SSE

---

### БАГ-5: Нет периодического опроса (polling) как fallback

**Файл:** `frontend/src/components/NotificationProvider.tsx`
**Серьезность:** Критический
**Симптом:** Если SSE упал — уведомления не доставляются до ручного открытия приложения

**Причина:**
Фронтенд запрашивает уведомления только:
1. При авторизации (начальная загрузка)
2. При получении SSE-сообщения
3. При возврате online

Если SSE не работает — нет механизма polling'а. Уведомления в БД есть, но пользователь их не видит.

**Решение:**
- Добавить `setInterval` (30-60 сек) для периодического `refetch()`
- Активировать polling только когда SSE в состоянии `error` или `disconnected`
- Отключать polling при восстановлении SSE

---

## ВЫСОКИЙ ПРИОРИТЕТ

### БАГ-6: `EventBus` теряет события при переполнении очереди

**Файл:** `backend/app/event_bus.py:36-37`
**Серьезность:** Высокий
**Симптом:** Уведомления иногда не доходят через SSE

**Причина:**
```python
except asyncio.QueueFull:
    logger.warning(f"Queue full for user {user_id}, dropping event {event_type}")
```

Очередь — 10 событий. Если вкладка была в фоне или SSE отстает — события молча теряются.

**Решение:**
- Увеличить размер очереди до 50
- Добавить механизм `drain_and_refetch`: при переполнении отправлять SSE-сигнал клиенту сделать полный `refetch()`

---

### БАГ-7: `find_due_tasks` загружает ВСЕ задачи в память

**Файл:** `backend/app/services/reminder_service.py:24-31`
**Серьезность:** Высокий (проявляется при росте данных)
**Симптом:** Напоминания начинают задерживаться при большом количестве задач

**Причина:**
```python
select(Task).options(selectinload(Task.user))
    .where(Task.due_date.isnot(None), Task.is_completed.is_(False))
```

При 10,000+ задач — все загружаются каждую минуту. Фильтрация по напоминаниям в Python, не в SQL.

**Решение:**
- Добавить SQL-фильтр:
```python
.where(
    Task.due_date.isnot(None),
    Task.is_completed.is_(False),
    or_(Task.reminder_time.isnot(None), Task.reminder_offsets.isnot(None))
)
```
- Добавить LIMIT для безопасности

---

### БАГ-8: `reminder_fired` блокирует редактирование напоминаний навсегда

**Файл:** `frontend/src/components/ReminderEditor.tsx:51-52`
**Серьезность:** Высокий
**Симптом:** После срабатывания напоминания пользователь не может изменить настройки для рекуррентных задач

**Причина:**
```typescript
const hasReminder = (!!reminderTime || !!reminderOffsets?.length) && !reminderFired
setEnabled(hasReminder)
```

`reminder_fired = True` → UI блокируется навсегда (до ручного обновления полей).

**Решение:**
- Для рекуррентных задач: сбрасывать `reminder_fired` при генерации нового вхождения
- В UI: показывать предупреждение "напоминание уже отправлено" вместо полной блокировки

---

### БАГ-9: Web Push не подключен — нет уведомлений при закрытом приложении

**Файл:** `frontend/src/sw.ts:50-73`
**Серьезность:** Высокий
**Симптом:** Уведомления не приходят, когда приложение закрыто

**Причина:**
Service Worker имеет обработчик `push` событий, но:
- Нет `pushManager.subscribe()` на клиенте
- Нет push-subscription endpoint на бэкенде
- Push-уведомления невозможны — код мертвый

**Решение:**
- Реализовать подписку на Web Push на клиенте
- Добавить endpoint для хранения push-subscriptions на бэкенде
- Отправлять push через webpush library (python)
- Интегрировать с scheduler'ом

---

## СРЕДНИЙ ПРИОРИТЕТ

### БАГ-10: Race condition при клике на browser notification

**Файл:** `frontend/src/utils/browserNotifications.ts:65-83`
**Серьезность:** Средний

`onclick` назначается после `await new Promise()`, который резолвится на `onshow`. Между этими событиями есть микро-зазор.

**Решение:**
Перенести назначение `onclick` до `await new Promise()`.

---

### БАГ-11: Нет звука уведомлений

**Серьезность:** Средний

Ни browser notifications, ни toast не воспроизводят звук.

**Решение:**
- Добавить `silent: false` и `sound` для browser notifications (где поддерживается)
- Для toast: воспроизводить короткий аудио-файл

---

### БАГ-12: Баг пагинации на странице уведомлений

**Файл:** `frontend/src/routes/Notifications.tsx`
**Серьезность:** Средний

`loadMore()` вызывает `refetch()` с новым offset, который заменяет весь массив вместо добавления.

**Решение:**
Изменить `refetch` для поддержки append-режима или создать отдельный метод `fetchMore`.

---

### БАГ-13: `should_send_reminder()` — мертвый код

**Файл:** `backend/app/services/reminder_service.py:177-187`
**Серьезность:** Низкий

Метод существует (проверка 24-часового кулдауна), но нигде не вызывается.

**Решение:**
Либо удалить, либо интегрировать в логику отправки.

---

### БАГ-14: Дублирование загрузки user в scheduler

**Файл:** `backend/app/scheduler.py:116-119`
**Серьезность:** Низкий

User уже загружен через `selectinload(Task.user)`, но scheduler делает дополнительный запрос.

**Решение:**
Использовать `task.user` напрямую.

---

## Сценарии несрабатывания (сводка)

| Сценарий | Что происходит | Баг |
|---|---|---|
| Множественные offsets `[5, 60, 1440]` | Сработает только первый | БАГ-1 |
| Пользователь в UTC- таймзоне | Напоминание после дедлайна | БАГ-2 |
| Сервер был выключен 30+ мин | Напоминание с опозданием или не приходит | БАГ-3 |
| SSE упал 5 раз подряд | Все будущие уведомления не показываются | БАГ-4 |
| SSE упал (нет polling) | Уведомления не доставляются | БАГ-5 |
| Вкладка в фоне, SSE отстает | События теряются | БАГ-6 |
| 10,000+ задач | Напоминания задерживаются | БАГ-7 |
| Пользователь закрыл вкладку | Уведомление не доставлено | БАГ-9 |

---

## План исправления (по приоритетам)

### Итерация 1: Критические баги бэкенда

1. **БАГ-1:** Переписать логику `reminder_offsets` — хранить отправленные оффсеты в отдельном JSON-поле `sent_reminder_offsets`
   - Добавить миграцию: колонка `sent_reminder_offsets` (JSON)
   - Переписать `find_due_tasks()` для независимой проверки каждого оффсета
   - Обновить `send_reminder()` для записи отправленного оффсета

2. **БАГ-2:** Исправить timezone-сравнение при клэмпинге `reminder_time`
   - Заменить `due_date.time()` на `due_date_local.time()` в строке 49

3. **БАГ-3:** Добавить startup recovery для напоминаний
   - Создать `_job_reminder_recovery` в scheduler
   - Искать задачи с не отправленными напоминаниями за последние 24ч

### Итерация 2: Критические баги фронтенда

4. **БАГ-4 + БАГ-5:** Переписать SSE реконнект + добавить polling fallback
   - Убрать хардкодный лимит 5 попыток
   - Бесконечный реконнект с бэкоффом (cap 30s)
   - Добавить periodic polling (30-60 сек) при неработающем SSE

5. **БАГ-6:** Увеличить очередь EventBus + добавить drain-механизм
   - Размер очереди: 10 → 50
   - При переполнении: отправлять SSE-сигнал для refetch

### Итерация 3: Высокий приоритет

6. **БАГ-7:** Оптимизировать SQL-запрос `find_due_tasks`
   - Добавить SQL-фильтр по `reminder_time` / `reminder_offsets`
   - Добавить LIMIT

7. **БАГ-8:** Исправить блокировку `reminder_fired` для рекуррентных задач
   - Сбрасывать `reminder_fired` при генерации нового вхождения
   - Показывать предупреждение вместо блокировки в UI

8. **БАГ-9:** Подключить Web Push
   - Добавить push-subscription endpoint на бэкенде
   - Реализовать `pushManager.subscribe()` на клиенте
   - Интегрировать с scheduler

### Итерация 4: Средний приоритет

9. **БАГ-10:** Исправить race condition onclick в browser notifications
10. **БАГ-11:** Добавить звук уведомлений
11. **БАГ-12:** Исправить пагинацию на странице уведомлений
12. **БАГ-13:** Удалить или использовать `should_send_reminder()`
13. **БАГ-14:** Убрать дублирующий запрос user в scheduler

---

## Файлы, затрагиваемые исправлениями

### Backend
- `backend/app/services/reminder_service.py` — основная логика (БАГ-1, 2, 3, 7, 13)
- `backend/app/scheduler.py` — scheduler jobs (БАГ-3, 14)
- `backend/app/models/task.py` — модель Task (БАГ-1: новое поле)
- `backend/app/event_bus.py` — EventBus (БАГ-6)
- `backend/app/api/sse.py` — SSE endpoint (БАГ-6)
- `backend/app/services/task_service.py` — сброс reminder_fired (БАГ-8)
- `backend/alembic/` — миграция для нового поля (БАГ-1)

### Frontend
- `frontend/src/services/sseManager.ts` — SSE реконнект (БАГ-4)
- `frontend/src/components/NotificationProvider.tsx` — polling fallback (БАГ-5)
- `frontend/src/stores/notificationStore.ts` — polling логика (БАГ-5)
- `frontend/src/utils/browserNotifications.ts` — onclick fix (БАГ-10)
- `frontend/src/components/ReminderEditor.tsx` — разблокировка UI (БАГ-8)
- `frontend/src/routes/Notifications.tsx` — пагинация (БАГ-12)
- `frontend/src/sw.ts` — Web Push подписка (БАГ-9)

### Документация
- `docs/features.md` — обновить при изменении функциональности
