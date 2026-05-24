# Доработка экспорта/импорта: CalendarEvent и недостающие поля Task

**Дата:** 2026-05-24
**Статус:** plan
**Критика:** docs/plans/2026-05-24-export-data-critique.md

## Проблема

После добавления календарных событий (CalendarEvent, EventRecurrence) и новых полей Task, экспорт в JSON не включает эти данные. При экспорте → импорте пользователь теряет:
- Все календарные события
- Связи задача ↔ событие (`event_id`)
- Частично состояние напоминаний

## Порядок импорта (с учётом FK-зависимостей)

```
areas → contexts → tags → verb_templates → projects
  → calendar_events      ← НОВОЕ (до Task, т.к. Task.event_id → FK на calendar_events)
  → tasks                ← event_id resolve через imported_event_ids
  → checklist_items
  → task_recurrences
  → event_recurrences    ← НОВОЕ (после calendar_events, т.к. оба FK на calendar_events)
  → task_tags
```

## План

### 1. Добавить сериализаторы в `export_import_service.py`

#### `_serialize_calendar_event(e: CalendarEvent)`
Поля модели:
- `id`, `title`, `description` (str)
- `start_time`, `end_time` — datetime через `_dt()`
- `all_day` (bool)
- `color`, `location` (str | None)
- `attendees` (JSON list | None) — как есть
- `recurrence_type`, `recurrence_config` — как в Task
- `recurrence_end_date` — datetime через `_dt()`
- `created_at`, `updated_at` — datetime через `_dt()`

#### `_serialize_event_recurrence(r: EventRecurrence)`
Поля модели:
- `id`, `event_id`, `generated_event_id` (str)
- `start_time_of_generated_event` — datetime через `_dt()`
- `generated_at` — datetime через `_dt()`
- `status` (str)

### 2. Добавить недостающие поля Task в `_serialize_task`

Добавить:
- `event_id` — FK на CalendarEvent
- `last_reminder_sent_at` — datetime через `_dt()`

Примечание: `sent_reminder_offsets` не экспортируется — это временное состояние отправки, пересоздаётся при следующем цикле напоминаний.

### 3. Обновить `export_data()` — добавить запросы

- Запрос `CalendarEvent` по `user_id`
- Собрать `event_ids` из календарных событий
- Запрос `EventRecurrence` по `event_ids` (аналогично task_ids → checklist/recurrences)
- Добавить ключи `calendar_events` и `event_recurrences` в секцию `"data"`

### 4. Обновить `import_data()` — ручной импорт CalendarEvent

**CalendarEvent нельзя импортировать через `_import_simple_entities`**, потому что `start_time` — NOT NULL datetime, а `_import_simple_entities` обрабатывает только created_at/updated_at.

Порядок в import_data:
1. После импорта projects, ДО импорта tasks — добавить блок импорта CalendarEvent
2. Ручной цикл (как у Project), с обработкой:
   - `start_time` — NOT NULL, парсить через `_parse_datetime()`
   - `end_time` — nullable datetime
   - `all_day` — bool, default False
   - `recurrence_type`, `recurrence_config`, `recurrence_end_date` — как в Task
   - `color`, `location`, `description`, `attendees` — nullable/simple
   - `_set_datetime_fields()` для `start_time`, `end_time`, `recurrence_end_date`, `created_at`, `updated_at`
3. Собрать `imported_event_ids: set[str]` для валидации Task.event_id
4. Cross-user: если existing.user_id != uid — создать копию с новым id через `_new_id()`

### 5. Обновить `import_data()` — Task.event_id как FK

`event_id` — это FK, не простое поле. Обработать аналогично context_id/area_id/project_id:
- `raw_event = item.get("event_id")`
- `event_id = self._resolve_id(raw_event, id_map)`
- Валидация: `if raw_event and event_id not in imported_event_ids: event_id = None`
- Устанавливать во всех трёх ветках (new/existing/update) как `obj.event_id = event_id`

Добавить `last_reminder_sent_at` в `_set_datetime_fields` для Task.

### 6. Обновить `import_data()` — ручной импорт EventRecurrence

После импорта task_recurrences, ДО task_tags:
- Ручной цикл (как TaskRecurrence)
- `event_id` → resolve через id_map, валидация в `imported_event_ids`
- `generated_event_id` → resolve через id_map, валидация в `imported_event_ids`
- `start_time_of_generated_event` — NOT NULL, через `_parse_datetime()`
- Если event_id или generated_event_id не найдены — `skipped += 1`

### 7. Обновить тесты `test_export_import.py`

- **Обновить `test_export_empty_data`**: добавить `"calendar_events"` и `"event_recurrences"` в список проверяемых ключей
- **Добавить `test_export_with_calendar_events`**: создать событие через API, проверить наличие в экспорте
- **Добавить `test_import_with_calendar_events`**: импортировать JSON с calendar_events, проверить создание
- **Добавить `test_export_import_roundtrip_with_events`**: создать событие + задачу с event_id, экспортировать, импортировать другому пользователю, проверить целостность
- **Обновить payload'ы в тестах**: добавить `"calendar_events": []` и `"event_recurrences": []` во все import-тесты

## Обратная совместимость

- Версия формата остаётся `"1.0"` — новые ключи additive, не breaking
- Старые JSON-файлы (без calendar_events/event_recurrences) импортируются без ошибок: `data.get("calendar_events", [])` вернёт `[]`
- Android-клиент и фронтенд не требуют изменений — они прокидывают JSON как есть
- BackupScheduleService автоматически начнёт включать calendar_events — без изменений кода

## Файлы для изменения

- `backend/app/services/export_import_service.py` — основная доработка
- `backend/tests/test_export_import.py` — тесты

## Модели-источники

- `backend/app/models/calendar_event.py` — CalendarEvent
- `backend/app/models/event_recurrence.py` — EventRecurrence
- `backend/app/models/task.py` — недостающие поля Task
