# Критический разбор плана исправления напоминаний v2

**Дата:** 2026-04-19
**Целевой документ:** `docs/plans/notifications/2026-04-19-notification-fix-v2.md`
**Основан на:** проверке актуального кода всех затрагиваемых файлов

---

## Что улучено относительно v1

v2 учёл все 5 блокеров из первой критики:
- ✅ Стратегия тестирования (13 тестов + timezone-кейсы)
- ✅ Миграция данных + downgrade
- ✅ `max_instances=1` (BUG-7b)
- ✅ BUG-8 пересмотрен — баннер вместо сброса логики
- ✅ Web Push, звук, пагинация вынесены
- ✅ Стратегия полей дедупликации описана
- ✅ `delivered_late` убрана
- ✅ Recovery окно увеличено до 7 дней

---

## Step 1 — Пять линз критики

### Lens 1: Completeness (Полнота)

| # | Проблема | Серьезность | Детали |
|---|----------|-------------|--------|
| C-1 | `find_due_tasks()` возвращает смешанные типы | 🔴 BLOCKER | BUG-1 код (стр. 68): `due_tasks.append((task, offset_minutes))` — кортеж. Но `reminder_time` ветка (стр. 78): `due_tasks.append(task)` — объект Task. Один список — два типа. Вызов `for task in due_tasks:` в scheduler.py:113 упадёт |
| C-2 | `send_reminder()` не принимает `offset_minutes` | 🔴 BLOCKER | Текущая сигнатура (reminder_service.py:83): `send_reminder(self, task, user)`. План требует записи offset в `sent_reminder_offsets`, но не показывает обновление сигнатуры и не показывает, как scheduler передаёт offset |
| C-3 | Scheduler caller не обновлён для нового return type | 🔴 BLOCKER | scheduler.py:110-132 вызывает `find_due_tasks()` и итерирует как `for task in due_tasks:`. После BUG-1 items могут быть кортежами — нужен unpacking |
| C-4 | Recovery job (BUG-3) — скелет без реализации | 🟡 WARNING | План показывает 5 строк комментариев, но нет кода. Не указано: отдельный job или расширение `_job_startup_recovery`? Как интегрируется с новым return type `find_due_tasks()`? |
| C-5 | Нет явного кода сброса полей в `update_task()` | 🟡 WARNING | Стратегия дедупликации говорит "сбрасываются оба поля", но в итерациях нет конкретного кода для `task_service.py:168-169`. Нужно добавить `sent_reminder_offsets = []` и `last_reminder_sent_at = None` |
| C-6 | Нет проверки `sent_reminder_offsets` в Pydantic-схемах | 🟡 WARNING | Новое поле в модели, но `TaskUpdate` и `TaskResponse` схемы не упомянуты в плане. Если `sent_reminder_offsets` случайно попадёт в API-ответ или update-request — утечка внутренних данных |

### Lens 2: Consistency (Согласованность)

| # | Проблема | Серьезность | Детали |
|---|----------|-------------|--------|
| CO-1 | `reminder_fired` конфликтует с множественными offsets | 🔴 BLOCKER | `send_reminder()` (reminder_service.py:99) всегда ставит `reminder_fired = True`. После offset=5 → `reminder_fired=True` → фронтенд получает `task:reminder-fired` event (notificationStore.ts:117-120) → ReminderEditor отключается (стр. 51). Но offset=60 и 1440 ещё не отправлены! BUG-8 исправляет это в Итерации 3, а BUG-1 — в Итерации 1. Между ними — сломанный UX |
| CO-2 | BUG-1 break после первого offset + continue — избыточно | 🟡 WARNING | Код BUG-1 (стр. 69-71): `break` внутри for-loop, затем `continue` во внешнем for-loop. `break` уже прерывает внутренний цикл, `continue` прыгает на следующую задачу. Логически верно, но визуально запутывает — можно упростить |
| CO-3 | Migration комментарий противоречит SQL | 🟡 WARNING | Комментарий (стр. 83-85): "помечать все оффсеты <= (due_date - last_reminder_sent_at) как отправленные". Но SQL (стр. 86): `SET sent_reminder_offsets = '[]'` — пустой массив. Коммент описывает эвристику, а SQL делает проще. Это допустимо (стр. 88-90 объясняют почему), но текст комментария вводит в заблуждение |

### Lens 3: Assumptions & Risks (Допущения и риски)

| # | Допущение | Что если ошибочно? | Серьезность |
|---|-----------|-------------------|-------------|
| A-1 | "`reminder_fired` не влияет на backend-логику отправки" | Верно для текущего `find_due_tasks()`. Но если будущий разработчик добавит проверку `reminder_fired` в SQL-фильтр (BUG-7) — множественные offsets сломаются | 🟡 WARNING |
| A-2 | "SQLite JSON хранит `sent_reminder_offsets` корректно" | SQLAlchemy JSON с SQLite = TEXT. Чтение/запись через Python. Нормально. Но если кто-то добавит SQL-фильтр по JSON-полю — нужны json_extract(), что не ORM-идиоматично | 🟢 SUGGESTION |
| A-3 | "7 дней recovery достаточно" | Сервер может быть отключён 2+ недели. Задачи с offset=1440 за 8 дней до due_date уже не будут восстановлены. Приемлемо для MVP, но стоит задокументировать ограничение | 🟢 SUGGESTION |
| A-4 | "Polling `GET /api/notifications?limit=5` — read-only, SQLite выдержит" | Верно при текущих масштабах. Но polling + scheduler + user writes = 3 источника нагрузки. При росте — первый кандидат на оптимизацию | 🟢 SUGGESTION |

### Lens 4: YAGNI & Scope Creep

| # | Элемент | Вердикт |
|---|---------|---------|
| Y-1 | BUG-6 (EventBus overflow → refetch) | Обоснованно — без этого события теряются бесследно |
| Y-2 | BUG-8 (баннер) в Итерации 3 | **Должен быть в Итерации 1** — напрямую связан с BUG-1 |
| Y-3 | Polling fallback (BUG-5) | Обоснованно — критический fallback для SSE |
| Y-4 | BUG-10/13/14 (средний приоритет) | Можно отложить, не влияют на корректность |

### Lens 5: Technical Feasibility

| # | Проблема | Серьезность | Детали |
|---|----------|-------------|--------|
| F-1 | Смешанный return type — реализуемо, но хрупко | 🔴 | `list[Task]` → `list[Task | tuple[Task, int]]` ломает type hints, затрудняет тестирование, запутывает разработчиков. Нужен унифицированный тип |
| F-2 | BUG-2 fix — корректность подтверждена | ✅ | Проверено на коде: замена `due_date.time()` → `due_date_local.time()` исправляет сравнение UTC vs local |
| F-3 | BUG-10 fix (onclick race) — не полный | 🟡 WARNING | `notification.close()` в setTimeout (browserNotifications.ts:72-74) закрывает уведомление через 10 сек. Если пользователь не успеет кликнуть — уведомление исчезнет. План не адресует это |

---

## Step 2 — Инверсия допущений

### Инверсия 1: Return type `find_due_tasks()`

```
Допущение:   Код из плана可以直接 быть вставлен в find_due_tasks()
Инверсия:    Смешанный return type ломает всех callers и type hints
Влияние:     scheduler.py:113 `for task in due_tasks:` получит кортеж вместо Task
             send_reminder() не получит offset_minutes → sent_reminder_offsets не запишется
             Recovery job тоже не сможет обработать смешанный тип
Устранение:  Унифицировать return type:
             - Вариант A: find_due_tasks() → list[tuple[Task, int | None]]
               (None для reminder_time режима)
             - Вариант B: Создать dataclass DueTask(task, offset_minutes)
             - Обновить scheduler caller и send_reminder signature
```

### Инверсия 2: `reminder_fired` безвреден

```
Допущение:   reminder_fired=True после каждого send_reminder() — норма
Инверсия:    reminder_fired=True дизейблит UI напоминаний на фронте после первого offset
Влияние:     Пользователь видит "Напоминание уже отправлено" после offset=5,
             хотя offset=60 и 1440 ещё pending. Он может удалить/изменить настройки,
             думая что всё уже отправлено
Устранение:  Переместить BUG-8 из Итерации 3 в Итерацию 1.
             В send_reminder(): для offset режима не ставить reminder_fired=True,
             пока не отправлены ВСЕ offsets. Или убрать зависимость UI от reminder_fired
             для offset режима
```

### Инверсия 3: Recovery job "просто вызывает find_due_tasks"

```
Допущение:   Recovery job тривиален — вызвал find_due_tasks() и send_reminder()
Инверсия:    find_due_tasks() возвращает смешанный тип, send_reminder() не принимает offset,
             а due_date может быть глубоко в прошлом — из-за 7-дневного окна
             могут отправиться десятки напоминаний за один вызов
Влияние:     Recovery job не заработает корректно с текущим дизайном.
             При массовом восстановлении — шквал уведомлений
Устранение:  1. Унифицировать return type (Инверсия 1)
             2. Добавить batch-limit в recovery (не более 50 напоминаний за запуск)
             3. Показать конкретный код recovery job, а не скелет
```

---

## Step 3 — Упущенные сценарии

| # | Сценарий | Риск | Как обработать |
|---|----------|------|----------------|
| M-1 | Recovery отправляет 100+ уведомлений за раз | 🟡 | Batch limit + spread over time. Не более N per recovery tick |
| M-2 | `sent_reminder_offsets` содержит невалидный JSON (null, строку) | 🟡 | Defensive parse: `task.sent_reminder_offsets or []` уже есть в плане, но если поле = `"null"` или `""` в SQLite — `set("null")` не упадёт, но даст неверный результат. Нужен `json.loads()` + fallback |
| M-3 | Пользователь редактирует `reminder_offsets` во время scheduler tick | 🟢 | Per-task try/except + commit уже есть. `sent_reminder_offsets` сбрасывается при update. Worst case: дубль одного offset. Приемлемо |
| M-4 | `due_date` в далёком будущем + offset=1440 → reminder_dt тоже в будущем | 🟢 | `now_utc >= calculated_reminder_dt` корректно фильтрует. Не проблема |
| M-5 | Browser notification закрывается через 10 сек (setTimeout) | 🟡 | browserNotifications.ts:72-74. Пользователь может не успеть кликнуть. План не адресует. Увеличить timeout или убрать авто-close |
| M-6 | `sent_reminder_offsets` утекает в API-ответ | 🟡 | Если Pydantic-схема `TaskResponse` использует `model_config` с `from_attributes=True`, новое поле автоматически попадёт в ответ. Нужен явный `exclude` |

---

## Step 4 — Сводная таблица

| # | Линза | Проблема | Серьезность | Исправление |
|---|-------|----------|-------------|-------------|
| 1 | Completeness | `find_due_tasks()` смешанный return type: Task и tuple | 🔴 BLOCKER | Унифицировать: `list[tuple[Task, int \| None]]` или dataclass |
| 2 | Completeness | `send_reminder()` не принимает `offset_minutes` | 🔴 BLOCKER | Добавить параметр `offset_minutes: int \| None = None`, писать в `sent_reminder_offsets` |
| 3 | Completeness | Scheduler caller не обновлён для кортежей | 🔴 BLOCKER | Обновить scheduler.py:113 — unpacking `(task, offset) = item` |
| 4 | Consistency | `reminder_fired=True` ломает UX для pending offsets | 🔴 BLOCKER | Переместить BUG-8 в Итерацию 1. Не ставить `reminder_fired=True` для offset режима до завершения всех offsets |
| 5 | Completeness | Recovery job — скелет без кода | 🟡 WARNING | Написать полную реализацию с учётом нового return type |
| 6 | Completeness | Нет кода сброса полей в `update_task()` | 🟡 WARNING | Добавить: `sent_reminder_offsets=[]` и `last_reminder_sent_at=None` при обновлении reminder-полей |
| 7 | Completeness | `sent_reminder_offsets` может утечь в API | 🟡 WARNING | Добавить `exclude` в Pydantic-схемы или `Column(..., server_default='[]')` |
| 8 | Feasibility | Browser notification close через 10 сек | 🟡 WARNING | Увеличить timeout или убрать auto-close |
| 9 | Consistency | Migration комментарий не соответствует SQL | 🟢 SUGGESTION | Упростить комментарий: "Инициализация пустым массивом — все past offsets отправятся при первом tick" |
| 10 | Completeness | Pydantic-схемы не упомянуты | 🟡 WARNING | Проверить TaskUpdate/TaskResponse — exclude `sent_reminder_offsets` |

---

## Verdict

```
VERDICT: 🟡 CONDITIONAL — устранить 4 блокера, затем приступать к реализации
```

### Причины:

План v2 — значительное улучшение над v1. Все 5 блокеров первой критики решены. Однако BUG-1 (центральный баг) вводит **неполную контрактную модель**: новый return type `find_due_tasks()` и обновлённый `send_reminder()` показаны фрагментарно, а callers не обновлены. Это не теоретический риск — код **не скомпилируется/не запустится** как написано.

### Что исправить перед реализацией:

1. **Унифицировать return type `find_due_tasks()`** — определить и задокументировать точный тип возвращаемого значения (например, `list[tuple[Task, int | None]]`), показать как обновляются обе ветки (`reminder_time` и `reminder_offsets`)

2. **Обновить `send_reminder()` signature** — добавить `offset_minutes: int | None = None`, показать полный код записи в `sent_reminder_offsets`

3. **Обновить scheduler caller** — показать unpacking кортежей в `_job_send_due_reminders`

4. **Переместить BUG-8 в Итерацию 1** — `reminder_fired=True` после первого offset дизейблит UI, пока остальные offsets ещё pending. Это часть BUG-1, не отдельный UX-улучшение

### Что можно исправить в процессе:

- Recovery job код (C-4) — написать полную реализацию
- `update_task()` reset (C-5) — добавить конкретные строки
- Pydantic exclude (C-6) — quick fix при обновлении схем
- Browser notification timeout (M-5) — низкий приоритет
