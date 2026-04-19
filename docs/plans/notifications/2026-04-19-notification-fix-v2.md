# План исправления системы напоминаний (v2)

**Дата:** 2026-04-19
**Версия:** 2.2
**Статус:** Не начат
**Основан на:** критических разборах `2026-04-19-notification-fix-critique.md` и `2026-04-19-notification-fix-v2-critique.md`

---

## Архитектура системы напоминаний

```
Scheduler (каждые 1 мин, max_instances=1)
  → ReminderService.find_due_tasks() — SQL-фильтрация + Python-перебор
    → send_reminder() — создание Notification в БД
      → EventBus.publish() — in-process pub/sub (queue=50)
        → SSE endpoint — push по HTTP (heartbeat 30 сек)
          → sseManager (frontend) — прием SSE (бесконечный реконнект)
            → notificationStore — обновление стора
              → browserNotifications — показ browser notification
        → [fallback] Polling (30s→60s→120s backoff) при недоступности SSE
```

---

## Стратегия полей дедупликации

Два режима напоминаний используют **разные поля** для отслеживания отправки:

| Режим | Поле в модели | Тип | Что хранит |
|---|---|---|---|
| `reminder_time` (конкретное время) | `last_reminder_sent_at` | `DateTime(tz)` | Timestamp последней отправки |
| `reminder_offsets` (за N мин до) | `sent_reminder_offsets` | `JSON` (новое) | Массив отправленных оффсетов: `[5, 60]` |

**Правила сосуществования:**
- В коде `if/elif` — одновременно активен только один режим
- `reminder_time` режим: как раньше — проверка `reminder_dt > last_reminder_sent_at`
- `reminder_offsets` режим: проверка `offset not in sent_reminder_offsets AND now >= due_date - offset`
- При обновлении `reminder_time` или `reminder_offsets` через API: сбрасываются оба поля
- `last_reminder_sent_at` сохраняется для `reminder_time` режима без изменений

---

## КРИТИЧЕСКИЕ БАГИ

### БАГ-1: Множественные `reminder_offsets` не работают — сработает только один

**Файл:** `backend/app/services/reminder_service.py:55-71`
**Серьезность:** Критический
**Симптом:** Из выбранных `[5, 60, 1440]` всегда срабатывает только самый маленький оффсет

**Причина:**
- `last_reminder_sent_at` — одна временная метка на всю задачу
- После отправки offset=5, проверка offset=60: `(due-60min) > (due-5min+1s)` = FALSE
- Второй и последующие оффсеты НИКОГДА не сработают

**Решение:**
1. Добавить колонку `sent_reminder_offsets` (JSON, default=`[]`) в модель Task
2. Переписать `find_due_tasks()` — **обе ветки возвращают кортеж `(task, offset_minutes)`**:
   - `reminder_time` режим → `(task, None)`
   - `reminder_offsets` режим → `(task, 60)`
   - Return type: `list[tuple[Task, int | None]]`
```python
async def find_due_tasks(self) -> list[tuple[Task, int | None]]:
    now_utc = datetime.now(ZoneInfo('UTC'))
    # Существующий SQL-фильтр: due_date IS NOT NULL, is_completed = False
    # BUG-7 (Итерация 3) добавит: OR(reminder_time IS NOT NULL, reminder_offsets IS NOT NULL)

    due_tasks: list[tuple[Task, int | None]] = []
    for task in tasks:
        if not task.user:
            continue

        user_timezone = ZoneInfo(task.user.timezone or 'Europe/Moscow')

        if task.reminder_time:
            due_date = task.due_date
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))
            due_date_local = due_date.astimezone(user_timezone)

            reminder_time_to_use = task.reminder_time
            if due_date_local.time() != time(0, 0) and task.reminder_time > due_date_local.time():
                reminder_time_to_use = time(due_date_local.hour, due_date_local.minute)

            reminder_dt_local = datetime.combine(due_date_local.date(), reminder_time_to_use, tzinfo=user_timezone)
            reminder_dt = reminder_dt_local.astimezone(ZoneInfo('UTC'))

            if now_utc >= reminder_dt:
                last_sent = task.last_reminder_sent_at
                if last_sent and last_sent.tzinfo is None:
                    last_sent = last_sent.replace(tzinfo=ZoneInfo('UTC'))
                if not last_sent or reminder_dt > last_sent:
                    due_tasks.append((task, None))

        elif task.reminder_offsets:
            due_date = task.due_date
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))
            sent_offsets = set(task.sent_reminder_offsets or [])
            for offset_minutes in task.reminder_offsets:
                if offset_minutes in sent_offsets:
                    continue
                calculated_reminder_dt = due_date - timedelta(minutes=offset_minutes)
                if now_utc >= calculated_reminder_dt:
                    due_tasks.append((task, offset_minutes))
                    break

    return due_tasks
```
3. Обновить `send_reminder()` — новый параметр `offset_minutes` + условный `reminder_fired`:
```python
async def send_reminder(
    self, task: Task, user: User, offset_minutes: int | None = None
) -> Notification:
    due_date = task.due_date
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))

    message = f'Напоминание о задаче "{task.title}"'

    notification = await self.create_notification(
        user=user, task=task, type='due_reminder', message=message
    )

    notification.delivered_at = datetime.now(ZoneInfo('UTC'))

    if offset_minutes is not None:
        # offset-режим: записываем отправленный offset
        # IMPORTANT: создаём новый список, не мутируем in-place —
        # SQLAlchemy JSON не отслеживает мутации, только присваивание
        sent = list(task.sent_reminder_offsets or [])
        sent.append(offset_minutes)
        task.sent_reminder_offsets = sent
        # reminder_fired — только когда ВСЕ offsets отправлены
        all_sent = set(task.reminder_offsets or []) <= set(sent)
        if all_sent:
            task.reminder_fired = True
    else:
        # reminder_time режим
        task.last_reminder_sent_at = datetime.now(ZoneInfo('UTC'))
        task.reminder_fired = True

    await self.db.flush()
    return notification
```

**Миграция данных:**
```sql
-- Инициализация пустым массивом — все past-due offsets
-- отправятся при первом tick. Это допустимо: лучше лишнее
-- напоминание, чем потерянное.
UPDATE tasks SET sent_reminder_offsets = '[]' WHERE sent_reminder_offsets IS NULL;
```

**Откат:**
```sql
-- Downgrade миграция
ALTER TABLE tasks DROP COLUMN sent_reminder_offsets;
```

---

### БАГ-2: `reminder_time` — баг сравнения таймзон при клэмпинге

**Файл:** `backend/app/services/reminder_service.py:48-50`
**Серьезность:** Критический
**Симптом:** В таймзонах с отрицательным UTC напоминания могут сработать после дедлайна

**Причина:**
Сравнивается `task.reminder_time` (local time) с `due_date.time()` (UTC time)

**Решение:**
Заменить сравнение на оба в локальной таймзоне (уже включено в полный код BUG-1 выше):
```python
# Было:
if due_date.time() != time(0, 0) and task.reminder_time > due_date.time():

# Стало:
if due_date_local.time() != time(0, 0) and task.reminder_time > due_date_local.time():
```

**Edge case — полночь:** Если `due_date_local.time() == time(0, 0)` из-за timezone конверсии (due=21:00 UTC → 00:00 MSK+3), клэмпинг пропускается. Это корректно: midnight due_date означает "целый день", клэмпинг не нужен.

**DST:** `zoneinfo.ZoneInfo` корректно обрабатывает DST. `datetime.combine(date, time, tzinfo=tz)` использует DST-правила на указанную дату.

---

### БАГ-3: Нет восстановления пропущенных напоминаний при перезапуске сервера

**Файл:** `backend/app/scheduler.py`
**Серьезность:** Критический
**Симптом:** Напоминания не приходят после перезапуска сервера

**Решение:**
Добавить `_job_reminder_recovery` — отдельный one-shot job при старте:
```python
@staticmethod
async def _job_reminder_recovery():
    """Запускается один раз при старте — отправляет пропущенные напоминания."""
    logger.info("Running job: reminder_recovery")

    try:
        from app.services.reminder_service import ReminderService

        async with AsyncSessionLocal() as session:
            reminder_service = ReminderService(session)

            # find_due_tasks() находит задачи, у которых:
            # - reminder_time/offsets в прошлом (включая deep past)
            # - sent_reminder_offsets/last_reminder_sent_at не установлен
            # Т.к. migration инициализирует sent_reminder_offsets=[],
            # а last_reminder_sent_at не меняется — все past-due reminders
            # будут найдены автоматически
            due_items = await reminder_service.find_due_tasks()
            logger.info(f"Recovery: found {len(due_items)} missed reminders")

            sent_count = 0
            for task, offset_minutes in due_items:
                try:
                    # task.user уже загружен через selectinload
                    if task.user:
                        notification = await reminder_service.send_reminder(
                            task, task.user, offset_minutes
                        )
                        await session.commit()

                        from app.event_bus import event_bus
                        # Note: при старте SSE-подключений нет, publish = no-op.
                        # Уведомления сохранены в БД — пользователи получат при refetch
                        await event_bus.publish(
                            f"{task.user.id}:notifications",
                            "notification_created",
                            {
                                "notification_id": str(notification.id),
                                "type": notification.type,
                                "message": notification.message,
                                "task_id": str(task.id) if task.id else None,
                            }
                        )
                        sent_count += 1
                except Exception as e:
                    logger.error(f"Recovery error for task '{task.title}': {e}")
                    await session.rollback()

            logger.info(f"Recovery: sent {sent_count} missed reminders")

    except Exception as e:
        logger.error(f"Error in reminder_recovery: {e}")
```

Регистрация в `startup()`:
```python
self.scheduler.add_job(
    self._job_reminder_recovery,
    'date',
    run_date=datetime.now(),
    id='reminder_recovery',
    replace_existing=True,
    max_instances=1,
)
```

Recovery не ограничен жёстким окном — `find_due_tasks()` найдёт ВСЕ незавершённые задачи с past-due reminders. Это корректно: если задача не завершена и есть напоминание — пользователь о ней забыл, уведомление полезно. Жёсткое окно не добавляется, чтобы не пропустить забытые задачи. Без `delivered_late` метки — просто отправляем, пользователь видит обычное уведомление. Batch-limit не нужен — `find_due_tasks()` сама ограничивает выборку SQL-фильтром (только задачи с reminders + не завершённые).

---

### БАГ-4: SSE лимит в 5 попыток — необратимое отключение

**Файл:** `frontend/src/services/sseManager.ts:158-166`
**Серьезность:** Критический
**Симптом:** После моргания Wi-Fi уведомления перестают приходить

**Решение:**
- Убрать `MAX_RECONNECT_ATTEMPTS` — бесконечный реконнект
- Бэкофф: 1s → 2s → 4s → 8s → 16s → 30s (cap)
- Сброс счетчика и delay при `BACKEND_RECOVERED`
- Уважать `navigator.onLine` — не пытаться при offline
- На мобильных: `document.addEventListener('visibilitychange')` — при возврате на вкладку принудительно реконнектить

---

### БАГ-5: Нет polling fallback при падении SSE

**Файл:** `frontend/src/components/NotificationProvider.tsx`
**Серьезность:** Критический

**Решение:**
Добавить polling с adaptive backoff в `notificationStore`:
```typescript
// Когда SSE в 'error' или 'disconnected' > 30 сек:
// Запустить interval: 30s → 60s → 120s (cap)
// Каждый тик: GET /api/notifications?limit=5
// Когда SSE восстановился — остановить polling
```

**Нагрузка:** При 1000 пользователей в worst case = 500 req/min (не все потеряют SSE одновременно). SQLite выдержит, т.к. это read-only запросы с индексами.

---

## ВЫСОКИЙ ПРИОРИТЕТ

### БАГ-6: `EventBus` теряет события при переполнении очереди

**Файл:** `backend/app/event_bus.py:36-37`
**Серьезность:** Высокий

**Решение:**
- Размер очереди: 10 → 50
- При `QueueFull`: не просто drop, а заменить старейшее событие в очереди на `{"type": "queue_overflow", "data": {}}`
- Клиент при получении `queue_overflow` делает `refetch()` — загружает все уведомления заново

---

### БАГ-7: `find_due_tasks` загружает ВСЕ задачи в память

**Файл:** `backend/app/services/reminder_service.py:24-31`
**Серьезность:** Высокий

**Решение:**
SQL-фильтрация:
```python
.where(
    Task.due_date.isnot(None),
    Task.is_completed.is_(False),
    or_(
        Task.reminder_time.isnot(None),
        Task.reminder_offsets.isnot(None)
    )
)
```

LIMIT не добавлять — все задачи с напоминаниями должны быть проверены. При LIMIT часть задач будет пропущена навсегда. Вместо LIMIT — SQL-фильтр (выше) резко сократит выборку.

---

### БАГ-7b: Scheduler tick > 60 сек → параллельные tick'и (НОВОЕ)

**Файл:** `backend/app/scheduler.py:24-38`
**Серьезность:** Высокий (блокер из критики)

**Причина:** APScheduler по умолчанию может запустить следующий tick, если предыдущий не завершился. При 10K задач один tick может занять > 60 сек → параллельная отправка → дублирование.

**Решение:**
Добавить `max_instances=1` ко всем scheduler jobs:
```python
self.scheduler.add_job(
    self._job_send_due_reminders,
    'interval',
    minutes=1,
    id='send_due_reminders',
    replace_existing=True,
    max_instances=1  # <-- новый параметр
)
```

---

### БАГ-8: `reminder_fired` — конфликт с множественными offsets + UX

**Файл:** `frontend/src/components/ReminderEditor.tsx:51-52` + `backend/app/services/reminder_service.py:99`
**Серьезность:** Высокий (повышен — напрямую связан с BUG-1)

**Проблема 1 (backend):** `send_reminder()` ставит `reminder_fired = True` после КАЖДОЙ отправки. Для offset-режима с offsets=[5, 60, 1440], после offset=5 поле = True, хотя offset=60 и 1440 ещё pending.

**Решение (backend):** Условная установка `reminder_fired` — только когда ВСЕ offsets отправлены (уже включено в обновлённый `send_reminder()` в BUG-1):
```python
# В send_reminder(), offset-ветка:
all_sent = set(task.reminder_offsets or []) <= set(sent)
if all_sent:
    task.reminder_fired = True
```

**Проблема 2 (frontend):** Пользователь открывает завершённую рекуррентную задачу и видит заблокированный UI напоминаний. `RecurrenceService.generate_next_task()` создаёт НОВУЮ задачу с `reminder_fired=False` — это корректно, но не очевидно.

**Решение (frontend):**
- В `ReminderEditor`: вместо блокировки показывать информационный баннер: "Напоминание для этой задачи уже отправлено. Для нового вхождения настройте напоминание в активной задаче."
- Ссылка на новую задачу (если известно её ID)
- Полная блокировка остается — редактирование бессмысленно для завершённой задачи

---

## ВЫНЕСЕНО В ОТДЕЛЬНЫЕ ПЛАНЫ

Следующие элементы не относятся к ядру исправления напоминаний:

| Баг | Причина выноса | Где сделать |
|---|---|---|
| БАГ-9: Web Push | Новая feature, недели работы, VAPID, push subscriptions | Отдельный план `notifications-web-push` |
| БАГ-11: Звук | Nice-to-have, не влияет на надежность | Отдельный план `notifications-sound` |
| БАГ-12: Пагинация | Баг страницы уведомлений, не системы напоминаний | Багфикс в отдельной задаче |

---

## СРЕДНИЙ ПРИОРИТЕТ

### БАГ-10: Race condition при клике на browser notification

**Файл:** `frontend/src/utils/browserNotifications.ts:65-83`

`onclick` назначается после `await new Promise()`. Перенести до await.

### БАГ-13: `should_send_reminder()` — мертвый код

**Файл:** `backend/app/services/reminder_service.py:177-187`

Удалить метод. Реальная дедупликация через `last_reminder_sent_at` и `sent_reminder_offsets`.

### БАГ-1b: Сброс полей дедупликации в `update_task()`

**Файл:** `backend/app/services/task_service.py:168-169`

Текущий код сбрасывает только `reminder_fired`. Нужно также сбрасывать поля дедупликации:
```python
# Было:
if 'reminder_time' in update_data or 'reminder_offsets' in update_data:
    update_data['reminder_fired'] = False

# Стало:
if 'reminder_time' in update_data or 'reminder_offsets' in update_data:
    update_data['reminder_fired'] = False
    update_data['sent_reminder_offsets'] = []
    update_data['last_reminder_sent_at'] = None
```

### БАГ-1c: Pydantic-схемы — защитить внутренние поля от API

**Файл:** `backend/app/schemas/task.py`

Внутренние поля дедупликации не должны управляться клиентом. Текущий `TaskUpdate` (стр. 73-74) уже содержит `reminder_fired: bool | None` и `last_reminder_sent_at: datetime | None` — клиент может отправить `{"reminder_fired": false}` и обойти дедупликацию.

**Решение:**

Удалить внутренние поля из `TaskUpdate`:
```python
# Удалить из TaskUpdate:
#   reminder_fired: bool | None = None          # → только backend
#   last_reminder_sent_at: datetime | None = None # → только backend

# НЕ добавлять в TaskUpdate:
#   sent_reminder_offsets                         # → только backend
```

`TaskResponse` — оставить `reminder_fired` и `last_reminder_sent_at` (полезно для frontend). `sent_reminder_offsets` НЕ добавлять в `TaskResponse` — это исключительно внутреннее поле.

`TaskCreate` — НЕ добавлять `sent_reminder_offsets`. `reminder_fired` и `last_reminder_sent_at` уже отсутствуют — корректно.

**Guard в сервисе (дополнительно):**
```python
# В task_service.py update_task() — defensive guard:
INTERNAL_FIELDS = {'reminder_fired', 'last_reminder_sent_at', 'sent_reminder_offsets'}
for field in INTERNAL_FIELDS:
    update_data.pop(field, None)
```

### БАГ-14: Scheduler — unpacking кортежей + убрать дублирующий запрос user

**Файл:** `backend/app/scheduler.py:100-140`

**Проблема 1:** После BUG-1 `find_due_tasks()` возвращает `list[tuple[Task, int | None]]`, но scheduler итерирует как `for task in due_tasks:`.

**Проблема 2:** Scheduler загружает user отдельным SQL-запросом, хотя `find_due_tasks()` уже делает `selectinload(Task.user)`.

**Решение:**
```python
@staticmethod
async def _job_send_due_reminders():
    logger.info("Running job: send_due_reminders")

    try:
        from app.services.reminder_service import ReminderService

        async with AsyncSessionLocal() as session:
            reminder_service = ReminderService(session)

            due_items = await reminder_service.find_due_tasks()
            logger.info(f"Found {len(due_items)} tasks with due reminders")

            for task, offset_minutes in due_items:
                try:
                    user = task.user  # уже загружен через selectinload
                    if user:
                        notification = await reminder_service.send_reminder(
                            task, user, offset_minutes
                        )
                        logger.info(f"Sent reminder for task '{task.title}' to user {user.username}")
                        await session.commit()

                        from app.event_bus import event_bus
                        await event_bus.publish(f"{user.id}:notifications", "notification_created", {
                            "notification_id": str(notification.id),
                            "type": notification.type,
                            "message": notification.message,
                            "task_id": str(task.id) if task.id else None,
                        })
                except Exception as e:
                    logger.error(f"Error sending reminder for task '{task.title}': {e}")
                    await session.rollback()

            logger.info(f"Processed {len(due_items)} due tasks for reminders")

    except Exception as e:
        logger.error(f"Error in job_send_due_reminders: {e}")
```

---

## Тестирование

### Существующие тесты для обновления

**Файл:** `backend/tests/test_reminder_service.py` (~406 строк)
- Обновить тесты `find_due_tasks` для новой логики `sent_reminder_offsets`
- Добавить тест: множественные offsets отправляются независимо
- Добавить тест: после отправки offset=5, offset=60 всё ещё может отправиться

### Новые тесты

| Тест | Что проверяет |
|---|---|
| `test_multiple_offsets_fire_independently` | offsets=[5,60,1440] — каждый срабатывает в своё время |
| `test_offset_not_fired_twice` | Отправленный offset не повторяется |
| `test_reminder_time_clamping_positive_utc` | UTC+3: reminder_time > due_local.time() → клэмпинг |
| `test_reminder_time_clamping_negative_utc` | UTC-5: reminder_time > due_local.time() → клэмпинг |
| `test_reminder_time_midnight_due_date` | due_date=00:00 → клэмпинг не применяется |
| `test_reminder_recovery_after_restart` | Recovery job находит пропущенные напоминания |
| `test_scheduler_no_parallel_ticks` | max_instances=1 предотвращает дублирование |
| `test_sent_reminder_offsets_migration` | Миграция корректно инициализирует пустые массивы |
| `test_dst_transition_reminder_time` | Напоминание корректно в день перехода DST |
| `test_sse_infinite_reconnect` | Нет лимита попыток, backoff корректный |
| `test_polling_activates_on_sse_failure` | Polling стартует при падении SSE |
| `test_polling_stops_on_sse_recovery` | Polling останавливается при восстановлении SSE |
| `test_eventbus_overflow_triggers_refetch` | Queue overflow → клиент делает refetch |
| `test_find_due_tasks_returns_tuples` | Обе ветки (time, offsets) возвращают `(Task, int \| None)` |
| `test_send_reminder_offset_writes_to_sent_array` | send_reminder с offset записывает в sent_reminder_offsets |
| `test_send_reminder_offset_conditional_fired` | reminder_fired=True только когда ВСЕ offsets отправлены |
| `test_send_reminder_time_sets_last_sent` | reminder_time режим обновляет last_reminder_sent_at |
| `test_update_task_resets_dedup_fields` | При обновлении reminder-полей сбрасываются оба поля дедупликации |

### Тестовые timezone-кейсы

```python
TIMEZONE_TEST_CASES = [
    ("Europe/Moscow", "+3"),      # Позитивный UTC
    ("America/New_York", "-5/-4"), # Негативный UTC + DST
    ("Asia/Tokyo", "+9"),          # Большой позитивный UTC
    ("UTC", "0"),                  # Базовый
    ("Pacific/Honolulu", "-10"),   # Большой негативный UTC, без DST
]
```

---

## Упущенные сценарии (из критики)

| Сценарий | Риск | Решение в этом плане |
|---|---|---|
| Scheduler tick > 60 сек | 🔴 | БАГ-7b: `max_instances=1` |
| Пользователь меняет timezone | 🟡 | Не решать в этом плане. reminder_time — абсолютное время в текущей timezone. При смене — пользователь сам обновляет задачи. Документировать |
| Scheduler race с user updates | 🟡 | Не решать в этом плане. Per-task commit + try/except обеспечивают достаточную изоляцию |
| Мобильный браузер убивает SSE | 🟡 | БАГ-4: `visibilitychange` → реконнект + polling fallback (БАГ-5) |
| DST переход | 🟡 | Тест `test_dst_transition_reminder_time`. `zoneinfo` обрабатывает DST корректно |
| Два таба одного пользователя | 🟢 | Уже решено через `tag` в Notification API |

---

## План исправления (итерации)

### Итерация 1: Критические баги бэкенда + контракт данных

1. **БАГ-1 + БАГ-2:** Переписать `find_due_tasks()` полностью
   - Добавить колонку `sent_reminder_offsets` (JSON, default=`[]`) в Task модель
   - Создать Alembic миграцию (upgrade + downgrade)
   - Переписать `find_due_tasks()` — return type `list[tuple[Task, int | None]]`, обе ветки возвращают кортежи
   - BUG-2: исправить timezone-сравнение `due_date.time()` → `due_date_local.time()`
   - Написать тесты: `test_multiple_offsets_fire_independently`, `test_offset_not_fired_twice`, timezone-кейсы

2. **БАГ-1 (продолжение):** Обновить `send_reminder()` — новый контракт
   - Добавить параметр `offset_minutes: int | None = None`
   - Запись отправленного offset в `sent_reminder_offsets`
   - Условная установка `reminder_fired` — только когда ВСЕ offsets отправлены
   - Для `reminder_time` режима — `last_reminder_sent_at` как раньше

3. **БАГ-14:** Обновить scheduler caller
   - Unpacking кортежей: `for task, offset_minutes in due_items:`
   - Использовать `task.user` напрямую (уже загружен через `selectinload`)
   - Передавать `offset_minutes` в `send_reminder()`

4. **БАГ-1b:** Сброс полей дедупликации в `update_task()`
   - При обновлении reminder-полей: `sent_reminder_offsets = []`, `last_reminder_sent_at = None`

5. **БАГ-1c:** Защитить внутренние поля от API
   - Удалить `reminder_fired`, `last_reminder_sent_at` из `TaskUpdate`
   - Не добавлять `sent_reminder_offsets` ни в одну клиентскую схему
   - Добавить defensive guard в `update_task()` на случай будущих изменений

6. **БАГ-3:** Добавить startup recovery
   - Создать `_job_reminder_recovery` в scheduler (полная реализация)
   - Окно recovery: 7 дней
   - Написать тест `test_reminder_recovery_after_restart`

7. **БАГ-7b:** Добавить `max_instances=1` для всех scheduler jobs
   - Написать тест `test_scheduler_no_parallel_ticks`

8. **БАГ-13:** Удалить `should_send_reminder()` — мертвый код

### Итерация 2: Критические баги фронтенда

9. **БАГ-4:** Переписать SSE реконнект
   - Убрать лимит 5 попыток
   - Бесконечный реконнект с бэкоффом (cap 30s)
   - `visibilitychange` → реконнект при возврате на вкладку
   - Не пытаться при `!navigator.onLine`
   - Написать тест `test_sse_infinite_reconnect`

10. **БАГ-5:** Добавить polling fallback
    - Polling с backoff: 30s → 60s → 120s (cap)
    - Активируется при SSE `error`/`disconnected` > 30 сек
    - Деактивируется при восстановлении SSE
    - Написать тесты: `test_polling_activates_on_sse_failure`, `test_polling_stops_on_sse_recovery`

11. **БАГ-6:** Увеличить очередь EventBus + overflow→refetch
    - Размер: 10 → 50
    - При overflow: заменить старейшее на `queue_overflow` сигнал
    - Написать тест `test_eventbus_overflow_triggers_refetch`

### Итерация 3: Оптимизация + UX

12. **БАГ-7:** SQL-фильтрация в `find_due_tasks`
    - Добавить `or_(Task.reminder_time.isnot(None), Task.reminder_offsets.isnot(None))`
    - LIMIT не добавлять

13. **БАГ-8 (frontend):** Информационный баннер вместо блокировки
    - Показывать "Напоминание уже отправлено" с пояснением
    - Ссылка на новую задачу для рекуррентных

14. **БАГ-10:** Исправить onclick race condition

---

## Файлы, затрагиваемые исправлениями

### Backend
| Файл | Баги | Изменения |
|---|---|---|
| `backend/app/models/task.py` | БАГ-1 | + колонка `sent_reminder_offsets` |
| `backend/app/services/reminder_service.py` | БАГ-1, 2, 7, 8, 13 | Перепись find_due_tasks (unified return type), timezone fix, условный reminder_fired, SQL filter, удалить dead code |
| `backend/app/services/task_service.py` | БАГ-1b, 1c | Сброс dedup-полей + guard внутренних полей |
| `backend/app/schemas/task.py` | БАГ-1c | Удалить внутренние поля из TaskUpdate |
| `backend/app/scheduler.py` | БАГ-3, 7b, 14 | + recovery job, max_instances=1, unpacking кортежей, task.user |
| `backend/app/event_bus.py` | БАГ-6 | queue 10→50, overflow→refetch signal |
| `backend/app/api/sse.py` | БАГ-6 | Обработка `queue_overflow` event |
| `backend/alembic/versions/` | БАГ-1 | Миграция + downgrade |

### Frontend
| Файл | Баги | Изменения |
|---|---|---|
| `frontend/src/services/sseManager.ts` | БАГ-4 | Бесконечный реконнект, visibilitychange |
| `frontend/src/stores/notificationStore.ts` | БАГ-5 | Polling логика |
| `frontend/src/components/NotificationProvider.tsx` | БАГ-5 | Интеграция polling |
| `frontend/src/components/ReminderEditor.tsx` | БАГ-8 | Баннер вместо блокировки |
| `frontend/src/utils/browserNotifications.ts` | БАГ-10 | onclick до await |

### Тесты
| Файл | Изменения |
|---|---|
| `backend/tests/test_reminder_service.py` | Обновить + новые тесты |
| `backend/tests/test_sse.py` | Обновить |

### Документация
- `docs/features.md` — обновить при изменении функциональности

---

## Изменения относительно v1

| Аспект | v1 | v2.1 |
|---|---|---|
| Стратегия полей дедупликации | Не описана | Чётко разделена: `last_reminder_sent_at` для time, `sent_reminder_offsets` для offsets |
| Миграция данных | Не описана | Описана стратегия для существующих данных |
| Откат миграций | Нет | Добавлены downgrade-миграции |
| Тестирование | Нет | Добавлен полный план тестирования + timezone-кейсы + контрактные тесты |
| Scheduler parallelism | Не рассмотрен | БАГ-7b: `max_instances=1` |
| БАГ-8 | "Сброс reminder_fired" | Пересмотрен: условная установка в backend + информационный баннер в frontend |
| `delivered_late` | Была в плане | Убрана — over-engineering |
| Web Push | В итерации 3 | Вынесен в отдельный план |
| Звук уведомлений | В итерации 4 | Вынесен в отдельный план |
| Пагинация | В итерации 4 | Вынесен в отдельную задачу |
| Recovery окно | 24 часа | 7 дней |
| Polling | Каждые 30-60 сек | Adaptive backoff: 30s→60s→120s |
| LIMIT в SQL | Был | Убран — конфликтует с полнотой проверки |
| SSE реконнект | Убрать лимит | + visibilitychange, + navigator.onLine check |
| Упущенные сценарии | Не рассмотрены | Таблица с решениями |

## Изменения v2 → v2.1 (по итогам второй критики)

| Аспект | v2 | v2.1 |
|---|---|---|
| `find_due_tasks()` return type | Смешанный: Task и tuple | Унифицированный: `list[tuple[Task, int \| None]]` |
| `send_reminder()` signature | `(task, user)` | `(task, user, offset_minutes=None)` — условная запись в dedup-поля |
| `reminder_fired` логика | `True` после каждой отправки | `True` только когда ВСЕ offsets отправлены (для offset-режима) |
| Scheduler caller | `for task in due_tasks:` | `for task, offset_minutes in due_items:` + `task.user` |
| Recovery job (BUG-3) | Скелет с комментариями | Полная реализация с EventBus publish |
| `update_task()` сброс полей | Упомянуто в прозе | Явный код: `sent_reminder_offsets=[]`, `last_reminder_sent_at=None` |
| Pydantic-схемы | Не упомянуты | BUG-1c: `sent_reminder_offsets` исключён из API |
| BUG-8 приоритет | Средний, Итерация 3 | Высокий, backend-часть в Итерации 1, frontend в Итерации 3 |
| Тесты контрактные | 13 тестов | +6 тестов на return type, send_reminder, dedup fields |
| BUG-14 детализация | Одна строка | Полный код scheduler caller |
| Migration комментарий | Противоречивый текст | Упрощён: "пустой массив → все past-due отправятся" |
