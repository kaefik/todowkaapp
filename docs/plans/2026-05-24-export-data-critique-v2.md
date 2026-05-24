# Критика плана v2: 2026-05-24-export-data.md

**Дата критики:** 2026-05-24 (итерация 2)
**Критикуемый документ:** `docs/plans/2026-05-24-export-data.md` (после исправлений по первой критике)
**Предыдущая критика:** `docs/plans/2026-05-24-export-data-critique.md`

---

## Оценка исправлений по первой критике

| # | Было | Стало | Статус |
|---|------|-------|--------|
| BLOCKER: порядок импорта | Не указан | Диаграмма порядка, CalendarEvent между Project и Task | ✅ Исправлено |
| BLOCKER: EventRecurrence порядок | Не указан | После calendar_events | ✅ Исправлено |
| WARNING: Task.event_id как FK | Не описан | Пункт 5 с resolve + validation | ✅ Исправлено |
| WARNING: _import_simple_entities | Предлагалось | Явно указано «нельзя, ручной импорт» | ✅ Исправлено |
| WARNING: test_export_empty_data | Не упомянуто | Пункт 7 обновляет | ✅ Исправлено |
| WARNING: CalendarEvent ≠ Project | «Аналогично Project» | Конкретные поля CalendarEvent | ✅ Исправлено |

---

## Step 1 — Пять линз критики (v2)

### Lens 1: Completeness (Полнота)

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 1 | **EventRecurrence не имеет `user_id`**, но существует cross-user сценарий. `_import_simple_entities` проверяет `existing.user_id != user_id`, но EventRecurrence не имеет этого поля. Пункт 6 не описывает cross-user ветку для EventRecurrence — что делать, если `existing` найден? EventRecurrence принадлежит CalendarEvent'у, не пользователю напрямую. Нужно: либо пропустить cross-user проверку, либо проверять через CalendarEvent.user_id. | 🟡 WARNING |
| 2 | **EventRecurrence.import_data не собирает `imported_event_recurrence_ids`**. Хотя сейчас нет сущностей, ссылающихся на EventRecurrence, если в будущем появятся — план не создаёт set для валидации. Некритично для текущей задачи. | 🟢 SUGGESTION |
| 3 | **CalendarEventService.create_event() использует `_to_utc()`** — преобразует datetime к naive UTC. При импорте из JSON datetime приходит с tzinfo (через `_parse_datetime`). План не упоминает необходимость `_to_utc()` при импорте CalendarEvent. Для `start_time` и `end_time` это может быть важно — хранимый формат в БД может быть naive UTC, а ISO-строка — с tzinfo. | 🟡 WARNING |
| 4 | **При cross-user импорте CalendarEvent**: план говорит «создать копию с новым id через `_new_id()`». Но если CalendarEvent имеет EventRecurrence, ссылающиеся на него по event_id, то при создании копии event_id в EventRecurrence тоже нужно маппить. Это покрывается логикой resolve в пункте 6, но стоит явно упомянуть. | 🟢 SUGGESTION |
| 5 | **Task.event_id nullable = True + ondelete='SET NULL'**. Это безопасно — при отсутствии CalendarEvent, event_id просто станет None. План корректно обрабатывает это. | ✅ OK |

### Lens 2: Consistency (Согласованность)

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 6 | **В пункте 4 не указано, что CalendarEvent имеет `user_id`** — в отличие от EventRecurrence. При ручном импорте нужно явно передавать `user_id`, и проверять `existing.user_id != uid` для cross-user. Пункт 4 упоминает это в п.4, но не в основном списке полей. | 🟢 SUGGESTION |
| 7 | **`_set_datetime_fields()` для CalendarEvent**: план указывает `[start_time, end_time, recurrence_end_date, created_at, updated_at]`. Но `start_time` — NOT NULL, и `_set_datetime_fields` делает `item.get(field)`, который вернёт None если ключа нет. Нужно убедиться, что `start_time` всегда присутствует в JSON. Сериализатор это гарантирует, но при импорте старых/внешних файлов — нет. | 🟡 WARNING |
| 8 | **Секция «Проблема»** упоминает «частично состояние напоминаний», но план решает экспортировать `last_reminder_sent_at` и не экспортировать `sent_reminder_offsets`. Стоит обновить описание проблемы, чтобы точно отражать что именно теряется. | 🟢 SUGGESTION |

### Lens 3: Assumptions & Risks (Допущения и риски)

| # | Допущение | Что если нет? | Серьёзность |
|---|-----------|---------------|-------------|
| 9 | `_parse_datetime()` корректно парсит все форматы ISO-8601, которые генерирует `.isoformat()` | Python `datetime.fromisoformat()` в 3.12 поддерживает все форматы ISO-8601 — OK | ✅ OK |
| 10 | CalendarEvent.title NOT NULL — всегда есть в JSON | Если JSON повреждён и title отсутствует — IntegrityError. Стоит добавить fallback `item.get("title", "")` | 🟡 WARNING |
| 11 | EventRecurrence ссылается на events, которые все принадлежат одному пользователю | При cross-user импорте оба event_id маппятся, оба CalendarEvent создаются с новым user_id — OK | ✅ OK |

### Lens 4: YAGNI & Scope Creep

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 12 | План сфокусирован и не раздут. ReviewSnapshot, DeletedEntity, Notification осознанно исключены. | ✅ OK |
| 13 | `last_reminder_sent_at` — граничный случай. Это временное состояние, которое устареет при импорте. Стоит рассмотреть: может не стоит экспортировать, как и `sent_reminder_offsets`? | 🟢 SUGGESTION |

### Lens 5: Technical Feasibility

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 14 | **EventRecurrence не имеет `user_id`** — проверка `existing = await self.db.get(EventRecurrence, entity_id)` может вернуть запись другого пользователя. Как определить «чужая» она или «своя»? Нужно проверять через связанный CalendarEvent.user_id, либо просто не делать cross-user проверку для EventRecurrence (они всегда создаются вместе с CalendarEvent). | 🟡 WARNING |
| 15 | **`generated_event_id` в EventRecurrence** при cross-user импорте: сгенерированное событие (generated_event) может ещё не существовать в БД при импорте, потому что оно создаётся как обычный CalendarEvent. Если в JSON generated_event_id ссылается на событие, которое идёт позже в массиве calendar_events — это ок, потому что все CalendarEvent импортируются до EventRecurrence. | ✅ OK |

---

## Step 2 — Assumption Inversion

### Инверсия 1
```
Допущение: start_time всегда присутствует в JSON для CalendarEvent
Инверсия:  start_time отсутствует или null в повреждённом JSON-файле
Влияние:   _set_datetime_fields установит start_time = None → IntegrityError при flush
Устранение: Добавить guard: if not item.get("start_time"): skipped += 1; continue
```

### Инверсия 2
```
Допущение: EventRecurrence не нужна cross-user проверка (нет user_id)
Инверсия:  EventRecurrence с entity_id уже существует и принадлежит чужому CalendarEvent
Влияние:   update полей чужой EventRecurrence → нарушение изоляции
Устранение: Проверять через existing.event → event.user_id != uid, либо
            всегда создавать новую при несовпадении user_id родительского CalendarEvent
```

### Инверсия 3
```
Допущение: _to_utc() не нужен при импорте (datetime хранится как есть)
Инверсия:  CalendarEventService использует _to_utc() при создании —
           datetime с tzinfo сохраняется как naive UTC в БД
Влияние:   При экспорте isoformat() вернёт naive datetime без tzinfo.
           При импорте fromisoformat() вернёт naive datetime.
           При повторном экспорте — всё ок (naive → isoformat → fromisoformat → naive).
           Проблем нет, но стоит убедиться, что в БД действительно хранится naive.
```

---

## Step 3 — Missing Scenarios

| Сценарий | Риск | Обработка |
|----------|------|-----------|
| CalendarEvent без `start_time` в JSON | 🟡 | Пропустить (skipped += 1) |
| CalendarEvent без `title` в JSON | 🟡 | Использовать fallback `""` |
| EventRecurrence: existing найден, но принадлежит другому пользователю | 🟡 | Проверить через CalendarEvent.user_id или всегда обновлять |
| CalendarEvent с `attendees: null` vs `attendees: []` | 🟢 | Оба варианта OK для JSONColumn |
| Повторный roundtrip того же JSON в ту же учётную запись | 🟢 | Upsert как у Project — OK |
| Пустой `"calendar_events": []` в старом файле | 🟢 | `data.get("calendar_events", [])` — OK |

---

## Step 4 — Verdict

### Summary Table

| # | Lens | Проблема | Серьёзность | Исправление |
|---|------|----------|-------------|-------------|
| 1 | Completeness | EventRecurrence не имеет user_id — cross-user сценарий не описан | 🟡 | Проверять через existing.event.user_id или не делать cross-user проверку |
| 3 | Completeness | _to_utc() не упомянут — актуальность при импорте | 🟡 | Проверить: если БД хранит naive UTC, при fromisoformat naive строки всё ок |
| 7 | Consistency | start_time NOT NULL + _set_datetime_fields может дать None | 🟡 | Guard: if not item.get("start_time"): skip |
| 10 | Assumptions | CalendarEvent.title может отсутствовать | 🟡 | Fallback `item.get("title", "")` |
| 14 | Feasibility | EventRecurrence cross-user — нет user_id для проверки | 🟡 | Проверять через CalendarEvent |

### Verdict

```
VERDICT: ✅ APPROVED — план готов к реализации

Оставшиеся WARNING'и — это детали реализации, которые нужно
учесть при написании кода, но они не требуют пересмотра архитектуры плана:

1. Guard для start_time (skip если нет)
2. Guard для title (fallback "")
3. EventRecurrence cross-user: проверять через CalendarEvent.user_id
4. Уточнить необходимость _to_utc() при импорте CalendarEvent
```

### Рекомендации для реализации (не блокируют)

1. **CalendarEvent import guard**: `if not item.get("start_time"): skipped += 1; continue`
2. **CalendarEvent title fallback**: `item.get("title", "")`
3. **EventRecurrence cross-user**: при существовании записи — проверить `existing.event.user_id != uid`, если чужая — создать копию
4. **_to_utc()**: проверить формат хранения в БД — если naive UTC, то `_parse_datetime()` для naive ISO-строк вернёт naive datetime, что корректно
