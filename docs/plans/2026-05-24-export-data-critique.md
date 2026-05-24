# Критика плана: 2026-05-24-export-data.md

**Дата критики:** 2026-05-24
**Критикуемый документ:** `docs/plans/2026-05-24-export-data.md`

---

## Step 1 — Пять линз критики

### Lens 1: Completeness (Полнота)

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 1 | **Не указан порядок импорта CalendarEvent.** CalendarEvent должен импортироваться ДО Task, потому что Task.event_id — это FK на calendar_events. План говорит «аналогично Project», но не указывает место в цепочке импорта. | 🔴 BLOCKER |
| 2 | **EventRecurrence ссылается на ДВА события** (`event_id` → CalendarEvent, `generated_event_id` → CalendarEvent). При импорте cross-user (когда id маппятся) оба CalendarEvent должны быть уже импортированы. План не описывает, что импорт EventRecurrence идёт ПОСЛЕ CalendarEvent. | 🔴 BLOCKER |
| 3 | **Task.event_id при импорте должен резолвиться через id_map** и проверяться на принадлежность к imported_event_ids — план упоминает event_id как «добавить в список полей», но не описывает логику resolve + validation. | 🟡 WARNING |
| 4 | **Обратная совместимость:** старые JSON-файлы (без calendar_events) должны импортироваться без ошибок. План не упоминает это. | 🟡 WARNING |
| 5 | **Android-клиент** (`ExportImportApi.kt`) и фронтенд (`exportImport.ts`) — не требуют изменений, они просто прокидывают JSON. Но план не упоминает проверку этого факта. | 🟢 SUGGESTION |
| 6 | **BackupScheduleService** тоже использует `ExportImportService.export_data()` — бэкапы в Telegram автоматически начнут включать calendar_events. План не упоминает проверку размера бэкапа. | 🟢 SUGGESTION |
| 7 | **Версия формата** остаётся `"1.0"`, хотя добавляются новые ключи. Старый импортёр будет игнорировать неизвестные ключи, но стоит явно зафиксировать это решение. | 🟢 SUGGESTION |
| 8 | **Тест `test_export_empty_data`** (строка 59) проверяет, что `data["data"][key] == []` для фиксированного списка ключей. После добавления `calendar_events` и `event_recurrences` этот тест сломается — план не упоминает обновление этого теста. | 🟡 WARNING |

### Lens 2: Consistency (Согласованность)

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 9 | Пункт 4 говорит «импорт CalendarEvent (аналогично Project, с resolve area_id)». Но CalendarEvent не имеет `area_id`. CalendarEvent имеет `user_id`, `title`, `description`, `start_time`, `end_time`, `all_day`, `color`, `location`, `attendees`, `recurrence_type`, `recurrence_config`, `recurrence_end_date`. Ссылка на Project вводит в заблуждение. | 🟡 WARNING |
| 10 | Пункт 1 говорит «все поля модели» для CalendarEvent — но `attendees` (JSON), `recurrence_config` (JSON), `start_time`/`end_time` (datetime), `all_day` (bool) — нужны уточнения по сериализации, особенно для `attendees` (может быть None/list). | 🟢 SUGGESTION |

### Lens 3: Assumptions & Risks (Допущения и риски)

| # | Допущение | Что если нет? | Серьёзность |
|---|-----------|---------------|-------------|
| 11 | «Старые JSON без calendar_events можно безопасно импортировать» | `data.get("calendar_events", [])` вернёт `[]` — OK. Но если кто-то проверяет ключи строгим equality — упадёт. | 🟢 SUGGESTION |
| 12 | «EventRecurrence всегда ссылается на события того же пользователя» | Если сгенерированное событие от другого пользователя (edge case при cross-user импорте) — нужно маппить оба event_id. | 🟡 WARNING |
| 13 | «sent_reminder_offsets и last_reminder_sent_at — некритичны» | При roundtrip импорте пользователь получит повторные push-уведомления, потому что `sent_reminder_offsets` сбросится. | 🟢 SUGGESTION |

### Lens 4: YAGNI & Scope Creep

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 14 | План предлагает экспортировать `sent_reminder_offsets` и `last_reminder_sent_at`. Это внутреннее состояние отправки уведомлений — экспортировать его не обязательно (оно пересоздастся при следующем цикле напоминаний). Можно пропустить и не усложнять. | 🟢 SUGGESTION |
| 15 | ReviewSnapshot и DeletedEntity не включены — это правильное решение. | ✅ OK |

### Lens 5: Technical Feasibility

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 16 | CalendarEvent.start_time — NOT NULL. При создании объекта через `_import_simple_entities` или ручной конструктор нужно обязательно передать `start_time`. Метод `_import_simple_entities` не умеет работать с NOT NULL datetime-полями кроме created_at/updated_at. CalendarEvent потребует ручной импорт как Project/Task. | 🟡 WARNING |
| 17 | EventRecurrence.start_time_of_generated_event — NOT NULL. Аналогично, требует ручной разбор datetime при импорте. | 🟡 WARNING |

---

## Step 2 — Assumption Inversion

### Инверсия 1
```
Допущение: CalendarEvent можно импортировать через _import_simple_entities
Инверсия:  CalendarEvent имеет NOT NULL datetime start_time, несовместимый с _import_simple_entities
Влияние:   Попытка использовать _import_simple_entities приведёт к None в start_time → IntegrityError
Устранение: Писать ручной импорт CalendarEvent (как Project), с _set_datetime_fields для start_time/end_time
```

### Инверсия 2
```
Допущение: Task.event_id можно просто добавить в task_fields
Инверсия:  event_id — это FK, требующий resolve через id_map + валидацию (как context_id, area_id)
Влияние:   При cross-user импорте event_id укажет на чужое событие → нарушение изоляции данных
Устранение: Обработать event_id как context_id/area_id/area_id — с resolve + проверкой в imported_event_ids
```

### Инверсия 3
```
Допущение: Старые JSON-файлы (без calendar_events) будут нормально импортироваться
Инверсия:  Тест test_export_empty_data строго проверяет набор ключей и сломается
Влияние:   Тесты не пройдут, CI будет красным
Устранение: Обновить список ключей в тесте + убедиться import_data использует .get() с дефолтом []
```

---

## Step 3 — Missing Scenarios

| Сценарий | Риск | Обработка |
|----------|------|-----------|
| Импорт старого JSON (без calendar_events/event_recurrences) | 🟢 | `data.get("calendar_events", [])` — работает автоматически |
| Экспорт пользователя с 10 000 событий → большой файл | 🟢 | Уже есть лимит 50MB в API и бэкапах |
| Cross-user импорт: Task ссылается на CalendarEvent другого пользователя | 🟡 | event_id нужно resolve через id_map, создать копию события с новым id |
| EventRecurrence ссылается на event_id, которого нет в импортируемом наборе (орфан) | 🟡 | Пропустить (skipped += 1), как уже делается для TaskRecurrence |
| CalendarEvent с recurrence_type, но без recurrence_config | 🟢 | Оба nullable, проблем нет |
| Повторный импорт того же файла (upsert) | 🟢 | CalendarEvent уже существует → update полей, как в Project |

---

## Step 4 — Verdict

### Summary Table

| # | Lens | Проблема | Серьёзность | Исправление |
|---|------|----------|-------------|-------------|
| 1 | Completeness | Порядок импорта CalendarEvent не указан | 🔴 | Импортировать CalendarEvent ПОСЛЕ Project, ДО Task |
| 2 | Completeness | EventRecurrence зависит от CalendarEvent — порядок не указан | 🔴 | Импортировать EventRecurrence ПОСЛЕ CalendarEvent |
| 3 | Completeness | Task.event_id не описан как FK с resolve | 🟡 | Добавить resolve + validation как для context_id |
| 8 | Completeness | Тест test_export_empty_data сломается | 🟡 | Добавить "calendar_events", "event_recurrences" в список ключей |
| 9 | Consistency | CalendarEvent не имеет area_id — «аналогично Project» неверно | 🟡 | Уточнить: ручной импорт с собственным набором полей |
| 16 | Feasibility | CalendarEvent.start_time NOT NULL — несовместим с _import_simple_entities | 🟡 | Писать ручной импорт |
| 17 | Feasibility | EventRecurrence.start_time_of_generated_event NOT NULL | 🟡 | Писать ручной импорт |
| 4 | Completeness | Обратная совместимость не упомянута | 🟡 | Добавить пункт: убедиться, что import_data tolerates отсутствие новых ключей |

### Verdict

```
VERDICT: 🟡 CONDITIONAL — устранить BLOCKER'ы (порядок импорта, start_time NOT NULL), затем приступать
```

### Уточнённый порядок импорта

```
areas → contexts → tags → verb_templates → projects
  → calendar_events    ← НОВОЕ (до Task, потому что Task.event_id → FK)
  → tasks              ← event_id resolve через imported_event_ids
  → checklist_items
  → task_recurrences
  → event_recurrences  ← НОВОЕ (после calendar_events, потому что оба FK)
  → task_tags
```

### Что нужно добавить в план

1. **Явный порядок импорта** с CalendarEvent между Project и Task
2. **Ручной импорт CalendarEvent** (не через `_import_simple_entities`) — из-за NOT NULL start_time
3. **Ручной импорт EventRecurrence** — из-за NOT NULL start_time_of_generated_event + двух FK
4. **Task.event_id** — обработать как FK с resolve + validation, не просто добавить в task_fields
5. **Обновить тест test_export_empty_data** — добавить ключи calendar_events, event_recurrences
6. **Упомянуть обратную совместимость** — import_data.get("calendar_events", []) работает
