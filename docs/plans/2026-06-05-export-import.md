# План улучшений экспорта/импорта

**Дата:** 2026-06-05
**Статус:** План (v2, после критики)

## Обзор проблем

### Проблема 1: CalendarEvent и EventRecurrence не экспортируются
Календарные события и их повторения полностью теряются при экспорт→импорт. Связь задач с событиями (event_id) также теряется.

### Проблема 2: event_id в Task не экспортируется
Модель Task имеет поле `event_id` (FK→calendar_events), но `_serialize_task()` его не включает, и импорт его не обрабатывает.

### Проблема 3: Нет выбора режима импорта
При импорте пользователь не может выбрать — создать дубликаты или заменить существующие данные. Это критично при загрузке файла другого пользователя.

### Проблема 4: Импорт не публикует SSE-события
После импорта другие вкладки и устройства не узнают о новых данных до следующего периодического pull (каждые 15 минут). Только вкладка, где выполнялся импорт, вызывает `performInitialSync()`.

---

## Изменения

### 1. Добавить CalendarEvent и EventRecurrence в экспорт

**Файл:** `backend/app/services/export_import_service.py`

- Добавить импорты моделей `CalendarEvent`, `EventRecurrence`
- Добавить сериализаторы:

```python
def _serialize_calendar_event(e: CalendarEvent) -> dict:
    return {
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "start_time": _dt(e.start_time),
        "end_time": _dt(e.end_time),
        "all_day": e.all_day,
        "color": e.color,
        "location": e.location,
        "attendees": e.attendees,
        "recurrence_type": e.recurrence_type,
        "recurrence_config": e.recurrence_config,
        "recurrence_end_date": _dt(e.recurrence_end_date),
        "created_at": _dt(e.created_at),
        "updated_at": _dt(e.updated_at),
    }

def _serialize_event_recurrence(r: EventRecurrence) -> dict:
    return {
        "id": r.id,
        "event_id": r.event_id,
        "generated_event_id": r.generated_event_id,
        "start_time_of_generated_event": _dt(r.start_time_of_generated_event),
        "generated_at": _dt(r.generated_at),
        "status": r.status,
    }
```

- В `export_data()`: загрузить CalendarEvent + EventRecurrence пользователя, добавить в `data`:
  - `"calendar_events": [_serialize_calendar_event(e) for e in events]`
  - `"event_recurrences": [_serialize_event_recurrence(r) for r in event_recurrences]`

### 2. Добавить event_id в экспорт/импорт Task

**Файл:** `backend/app/services/export_import_service.py`

- В `_serialize_task()`: добавить `"event_id": t.event_id`
- В `_import_data_impl()`: при импорте Task резолвить `event_id` через `id_map` (как area_id, project_id). Если резолвленный event_id не в множестве импортированных event_ids — установить `None`

### 3. Режимы импорта (replace / duplicate)

#### 3.1 API: параметр mode

**Файл:** `backend/app/api/export_import.py`

- Добавить query-параметр `mode: str = "duplicate"` в эндпоинт `import_data`
- Валидация: `mode in ("replace", "duplicate")`, иначе 400
- Передать `mode` в `ExportImportService.import_data()`

**Файл:** `backend/app/services/export_import_service.py`

- Обновить сигнатуру: `import_data(self, user_id: UUID, import_data: dict, mode: str = "duplicate")`
- Передать `mode` в `_import_data_impl()`

#### 3.2 Логика duplicate-режима

При `mode="duplicate"`:
- **Все** сущности получают новые UUID через `_new_id()` — независимо от того, принадлежат ли они текущему пользователю
- `id_map` заполняется для каждой сущности
- FK-ссылки резолвятся через `id_map`
- Существующие записи текущего пользователя **не трогаются**

При `mode="replace"` — текущее поведение (upsert для совпадающих ID, новый UUID для чужих)

#### 3.2.1 Расширение _import_simple_entities

Текущий метод обрабатывает datetime только для `created_at`/`updated_at`. Для CalendarEvent нужно также парсить `start_time`, `end_time`, `recurrence_end_date`. Добавить параметр:

```python
async def _import_simple_entities(
    self, user_id, items, model_class, fields,
    imported, key, errors, id_map, mode="replace",
    extra_datetime_fields: list[str] | None = None,
):
    datetime_fields = ["created_at", "updated_at"]
    if extra_datetime_fields:
        datetime_fields.extend(extra_datetime_fields)

    ids: set[str] = set()
    count = 0
    for item in items:
        entity_id = item.get("id")
        if not entity_id:
            continue
        if mode == "duplicate":
            new_id = self._new_id(entity_id, id_map)
            kwargs = {"id": new_id, "user_id": user_id}
            for field in fields:
                if field in item:
                    kwargs[field] = item[field]
            obj = model_class(**kwargs)
            self._set_datetime_fields(obj, item, datetime_fields)
            self.db.add(obj)
            ids.add(new_id)
        else:
            existing = await self.db.get(model_class, entity_id)
            if existing is not None and existing.user_id != user_id:
                new_id = self._new_id(entity_id, id_map)
                kwargs = {"id": new_id, "user_id": user_id}
                for field in fields:
                    if field in item:
                        kwargs[field] = item[field]
                obj = model_class(**kwargs)
                self._set_datetime_fields(obj, item, datetime_fields)
                self.db.add(obj)
                ids.add(new_id)
            elif existing is not None:
                for field in fields:
                    if field in item:
                        setattr(existing, field, item[field])
                self._set_datetime_fields(existing, item, datetime_fields)
                ids.add(entity_id)
            else:
                kwargs = {"id": entity_id, "user_id": user_id}
                for field in fields:
                    if field in item:
                        kwargs[field] = item[field]
                obj = model_class(**kwargs)
                self._set_datetime_fields(obj, item, datetime_fields)
                self.db.add(obj)
                ids.add(entity_id)
        count += 1
    imported[key] = count
    return ids
```

Вызов для CalendarEvent:
```python
event_ids = await self._import_simple_entities(
    uid, data.get("calendar_events", []), CalendarEvent,
    ["title", "description", "all_day", "color", "location",
     "attendees", "recurrence_type", "recurrence_config"],
    imported, "calendar_events", errors, id_map, mode,
    extra_datetime_fields=["start_time", "end_time", "recurrence_end_date"],
)
```

Примечание: поля `start_time`, `end_time`, `recurrence_end_date` **не** включаются в `fields`, т.к. они передаются как строки в JSON и должны парситься через `_parse_datetime`, а не как plain values. Они обрабатываются через `extra_datetime_fields` → `_set_datetime_fields()`.

#### 3.2.2 Duplicate-режим для Task-цикла

Task имеет 4 FK-поля (context_id, area_id, project_id, event_id) + datetime-поля + time-поле (reminder_time). При `mode="duplicate"` логика:

```python
for item in data.get("tasks", []):
    entity_id = item.get("id")
    if not entity_id:
        continue

    # FK-резолвинг — общий для обоих режимов
    raw_ctx = item.get("context_id")
    raw_area = item.get("area_id")
    raw_proj = item.get("project_id")
    raw_event = item.get("event_id")
    context_id = self._resolve_id(raw_ctx, id_map)
    area_id = self._resolve_id(raw_area, id_map)
    project_id = self._resolve_id(raw_proj, id_map)
    event_id = self._resolve_id(raw_event, id_map)
    # Валидация FK (проверка что цель существует)
    if raw_ctx and context_id not in context_ids:
        context_id = None
    if raw_area and area_id not in area_ids:
        area_id = None
    if raw_proj and project_id not in imported_project_ids:
        project_id = None
    if raw_event and event_id not in event_ids:
        event_id = None

    if mode == "duplicate":
        # Всегда новый UUID
        new_id = self._new_id(entity_id, id_map)
        obj = Task(
            id=new_id, user_id=uid,
            title=item.get("title", ""),
            context_id=context_id,
            area_id=area_id,
            project_id=project_id,
            event_id=event_id,
        )
        for field in task_fields:
            if field in item:
                setattr(obj, field, item[field])
        self._set_datetime_fields(obj, item, [
            "completed_at", "due_date", "recurrence_end_date",
            "trashed_at", "created_at", "updated_at",
        ])
        if item.get("reminder_time") is not None:
            obj.reminder_time = self._parse_time(item["reminder_time"])
        self.db.add(obj)
        imported_task_ids.add(new_id)
    else:
        # Текущая логика (upsert)
        existing = await self.db.get(Task, entity_id)
        if existing is not None and existing.user_id != uid:
            # ... новый ID для чужого (как сейчас)
        elif existing is not None:
            # ... upsert (как сейчас)
        else:
            # ... создать с оригинальным ID (как сейчас)
    task_count += 1
```

Аналогично для Projects (FK→area_id) и ChecklistItems (FK→task_id).

#### 3.2.3 Duplicate-режим для TaskRecurrences и EventRecurrences

Эти сущности не имеют `user_id`. При `mode="duplicate"`:

```python
# TaskRecurrences
for item in data.get("task_recurrences", []):
    entity_id = item.get("id")
    if not entity_id:
        continue
    task_id = self._resolve_id(item.get("task_id"), id_map)
    gen_task_id = self._resolve_id(item.get("generated_task_id"), id_map)
    if not task_id or task_id not in imported_task_ids:
        skipped += 1
        continue
    if not gen_task_id or gen_task_id not in imported_task_ids:
        skipped += 1
        continue

    if mode == "duplicate":
        # Всегда новый UUID
        new_id = self._new_id(entity_id, id_map)
        obj = TaskRecurrence(
            id=new_id, task_id=task_id,
            generated_task_id=gen_task_id,
            status=item.get("status", "completed"),
        )
        self._set_datetime_fields(obj, item, [
            "due_date_of_generated_task", "generated_at",
        ])
        self.db.add(obj)
    else:
        # Текущая логика (upsert)
        existing = await self.db.get(TaskRecurrence, entity_id)
        if existing is not None:
            existing.task_id = task_id
            existing.generated_task_id = gen_task_id
            # ...
        else:
            # ... создать
    recurrence_count += 1
```

### 3.3 Импорт CalendarEvent и EventRecurrence

**Файл:** `backend/app/services/export_import_service.py`

Порядок импорта (обновлённый):

1. Areas, Contexts, Tags, VerbTemplates (без FK)
2. Projects (FK→Areas)
3. **CalendarEvents** (без FK от других, но на них ссылается Task.event_id)
4. Tasks (FK→Contexts, Areas, Projects, CalendarEvents)
5. ChecklistItems (FK→Tasks)
6. TaskRecurrences (FK→Tasks)
7. EventRecurrences (FK→CalendarEvents)
8. TaskTags (M:N)

**CalendarEvents** — фаза 3. Импортировать через расширенный `_import_simple_entities` (см. 3.2.1) с полями:
`["title", "description", "all_day", "color", "location", "attendees", "recurrence_type", "recurrence_config"]`
Плюс `extra_datetime_fields=["start_time", "end_time", "recurrence_end_date"]`

**Важно:** CalendarEvent имеет `user_id` — поэтому `_import_simple_entities` с проверкой `existing.user_id != user_id` работает корректно.

**EventRecurrences** — фаза 7, после CalendarEvents и Tasks. EventRecurrence **не имеет** `user_id`, поэтому нельзя использовать `_import_simple_entities`. Импортировать отдельным циклом (аналогично TaskRecurrences):

```python
event_rec_count = 0
for item in data.get("event_recurrences", []):
    entity_id = item.get("id")
    if not entity_id:
        continue
    event_id = self._resolve_id(item.get("event_id"), id_map)
    gen_event_id = self._resolve_id(item.get("generated_event_id"), id_map)
    if not event_id or event_id not in event_ids:
        skipped += 1
        continue
    if not gen_event_id or gen_event_id not in event_ids:
        skipped += 1
        continue

    if mode == "duplicate":
        new_id = self._new_id(entity_id, id_map)
        obj = EventRecurrence(
            id=new_id, event_id=event_id,
            generated_event_id=gen_event_id,
            status=item.get("status", "completed"),
        )
        self._set_datetime_fields(obj, item, [
            "start_time_of_generated_event", "generated_at",
        ])
        self.db.add(obj)
    else:
        existing = await self.db.get(EventRecurrence, entity_id)
        if existing is not None:
            existing.event_id = event_id
            existing.generated_event_id = gen_event_id
            for field in ["status"]:
                if field in item:
                    setattr(existing, field, item[field])
            self._set_datetime_fields(existing, item, [
                "start_time_of_generated_event", "generated_at",
            ])
        else:
            obj = EventRecurrence(
                id=entity_id, event_id=event_id,
                generated_event_id=gen_event_id,
                status=item.get("status", "completed"),
            )
            self._set_datetime_fields(obj, item, [
                "start_time_of_generated_event", "generated_at",
            ])
            self.db.add(obj)
    event_rec_count += 1
imported["event_recurrences"] = event_rec_count
```

### 4. SSE-события после импорта

**Файл:** `backend/app/services/export_import_service.py`

После завершения `_import_data_impl()` — опубликовать SSE-события, чтобы другие вкладки и устройства узнали об изменениях:

```python
from app.services.event_bus import event_bus

# В конце _import_data_impl(), перед return:
for resource_type in ["task", "project", "area", "context", "tag", "calendar_event", "checklist_item", "verb_template"]:
    if resource_type in imported and imported[resource_type] > 0:
        await event_bus.publish(f"{resource_type}_updated", {
            "user_id": uid,
            "source": "import",
        })
```

**Файл:** `backend/app/api/export_import.py`

Убедиться что `event_bus` доступен из сервиса. Если `event_bus` требует `db_session` — передать через конструктор или импортировать напрямую.

**Альтернатива (проще):** публиковать единое событие `data_imported` с user_id, а SyncProvider на фронтенде обрабатывать его как триггер для `performInitialSync`. Это avoids публикации N событий:

```python
await event_bus.publish("data_imported", {"user_id": uid})
```

**Фронтенд:** в `SyncProvider.tsx` добавить обработку `data_imported` → вызвать `performInitialSync(userId)`. Это обеспечит синхронизацию на всех вкладках.

### 5. Фронтенд: модалка выбора режима

#### 5.1 API-клиент

**Файл:** `frontend/src/api/exportImport.ts`

- Обновить `importData(file: File, mode: 'replace' | 'duplicate' = 'duplicate')`:
  - Добавить `mode` как query-параметр: `?mode=${mode}`

#### 5.2 UI: модалка

**Файл:** `frontend/src/routes/Settings.tsx`

Поток:
1. Пользователь нажимает «Импорт данных» → открывается файловый диалог
2. После выбора файла → появляется модалка с двумя вариантами:
   - **«Создать дубликаты»** (по умолчанию) — все записи добавятся как новые, существующие не затрагиваются
   - **«Заменить данные»** — совпадающие записи будут перезаписаны данными из файла
3. При клике на вариант — вызывается `exportImportApi.importData(file, mode)`
4. После успешного импорта — `performInitialSync(user.id)` вызывается немедленно, до любого другого действия

Реализация — стейт `importFile` и условный рендер модалки вместо `confirm()`:

```tsx
const [importFile, setImportFile] = useState<File | null>(null)
const [showImportModeDialog, setShowImportModeDialog] = useState(false)

// В обработчике выбора файла:
onChange={(e) => {
  const file = e.target.files?.[0]
  if (file) {
    setImportFile(file)
    setShowImportModeDialog(true)
  }
  e.target.value = ''
}}

// Модалка:
{showImportModeDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
      <h3>{t('importModeTitle')}</h3>
      <p>{t('importModeDescription')}</p>
      <div className="space-y-3 mt-4">
        <button onClick={() => handleImportWithMode('duplicate')}>
          {t('importModeDuplicate')}
          <span>{t('importModeDuplicateHint')}</span>
        </button>
        <button onClick={() => handleImportWithMode('replace')}>
          {t('importModeReplace')}
          <span>{t('importModeReplaceHint')}</span>
        </button>
      </div>
      <button onClick={cancelImport}>{t('importModeCancel')}</button>
    </div>
  </div>
)}
```

Toast после импорта различает режимы:
- duplicate: «Импортировано N дубликатов: задач — X, проектов — Y»
- replace: «Данные обновлены: задач — X, проектов — Y»

#### 5.3 Переводы

**Файлы:** каждый язык — свой файл, как в текущей структуре проекта

**`frontend/src/i18n/locales/ru/settings.json`:**
```json
{
  "importModeTitle": "Режим импорта",
  "importModeDescription": "Выберите, как импортировать данные из файла",
  "importModeDuplicate": "Создать дубликаты",
  "importModeDuplicateHint": "Все записи добавятся как новые, существующие не изменятся",
  "importModeReplace": "Заменить данные",
  "importModeReplaceHint": "Совпадающие записи будут перезаписаны данными из файла",
  "importModeCancel": "Отмена",
  "importSuccessDuplicate": "Импортировано дубликатов: задач — {{tasks}}, проектов — {{projects}}",
  "importSuccessReplace": "Данные обновлены: задач — {{tasks}}, проектов — {{projects}}"
}
```

**`frontend/src/i18n/locales/en/settings.json`:**
```json
{
  "importModeTitle": "Import mode",
  "importModeDescription": "Choose how to import data from the file",
  "importModeDuplicate": "Create duplicates",
  "importModeDuplicateHint": "All records will be added as new, existing ones won't change",
  "importModeReplace": "Replace data",
  "importModeReplaceHint": "Matching records will be overwritten with data from the file",
  "importModeCancel": "Cancel",
  "importSuccessDuplicate": "Duplicates imported: tasks — {{tasks}}, projects — {{projects}}",
  "importSuccessReplace": "Data updated: tasks — {{tasks}}, projects — {{projects}}"
}
```

**`frontend/src/i18n/locales/tt/settings.json`:**
```json
{
  "importModeTitle": "Импорт режимы",
  "importModeDescription": "Файлдан мәгълүматны ничек импорт итәргә сайлагыз",
  "importModeDuplicate": "Күчермәләр булдырырга",
  "importModeDuplicateHint": "Бөтен язмалар яңа итеп өстәләчәк, булганнар үзгәртелмәячәк",
  "importModeReplace": "Мәгълүматны алмаштырырга",
  "importModeReplaceHint": "Туры килүче язмалар файлдагы мәгълүмат белән яңартылачак",
  "importModeCancel": "Баш тарту",
  "importSuccessDuplicate": "Күчермәләр импортланды: бурычлар — {{tasks}}, проектлар — {{projects}}",
  "importSuccessReplace": "Мәгълүмат яңартылды: бурычлар — {{tasks}}, проектлар — {{projects}}"
}
```

### 6. Тесты

**Файл:** `backend/tests/test_export_import.py`

Новые тесты:

1. **test_export_includes_calendar_events** — создать CalendarEvent, экспортировать, проверить наличие в data.calendar_events
2. **test_export_includes_event_recurrences** — создать EventRecurrence, экспортировать, проверить
3. **test_export_includes_event_id_in_task** — создать Task с event_id, экспортировать, проверить поле
4. **test_import_duplicate_mode_creates_new_ids** — импортировать файл с mode=duplicate, проверить что все ID новые и не совпадают с исходными
5. **test_import_duplicate_mode_preserves_existing** — создать данные, импортировать с mode=duplicate, проверить что старые данные на месте и не изменены
6. **test_import_replace_mode_updates_existing** — создать задачу, импортировать обновление с mode=replace, проверить upsert
7. **test_import_invalid_mode_returns_400** — передать mode=invalid, проверить 400
8. **test_import_calendar_events** — импортировать файл с calendar_events, проверить создание и корректность datetime-полей (start_time, end_time)
9. **test_import_event_recurrences** — импортировать файл с event_recurrences, проверить создание (без проверки user_id, т.к. его нет)
10. **test_import_task_event_id_resolved** — импортировать Task с event_id, проверить что связь сохранена
11. **test_import_old_format_without_calendar_events** — импортировать старый файл (без calendar_events/event_recurrences), проверить что импорт проходит без ошибок
12. **test_cross_user_duplicate_mode** — пользователь B импортирует файл пользователя A с mode=duplicate, проверить что все ID новые и данные не конфликтуют с существующими

### 7. Обновление документации

**Файл:** `docs/features.md`

Создать новый раздел "Экспорт и импорт данных":
- Экспорт всех данных в JSON (11 типов сущностей: areas, contexts, tags, verb_templates, calendar_events, projects, tasks, checklist_items, task_recurrences, event_recurrences, task_tags)
- Импорт с выбором режима: дубликаты (безопасный, по умолчанию) или замена
- Поддержка CalendarEvent и EventRecurrence
- Связь Task→CalendarEvent (event_id) сохраняется при экспорт/импорт
- Обратная совместимость со старыми файлами

---

## Порядок реализации

1. **Бэкенд: CalendarEvent + EventRecurrence в экспорт** — сериализаторы + запросы в export_data()
2. **Бэкенд: event_id в Task** — добавить в _serialize_task()
3. **Бэкенд: расширить _import_simple_entities** — параметр `extra_datetime_fields` + `mode`
4. **Бэкенд: CalendarEvent в импорт** — фаза 3 через расширенный _import_simple_entities
5. **Бэкенд: EventRecurrence в импорт** — фаза 7, отдельный цикл (без user_id)
6. **Бэкенд: event_id в Task импорт** — резолв через id_map + валидация FK
7. **Бэкенд: параметр mode + логика duplicate** — API + сервис (Task, Project, ChecklistItem, TaskRecurrence, TaskTag циклы)
8. **Бэкенд: SSE-событие data_imported** — event_bus.publish после импорта
9. **Фронтенд: SyncProvider** — обработка SSE data_imported → performInitialSync
10. **Фронтенд: API-клиент** — mode параметр
11. **Фронтенд: модалка выбора режима** — Settings.tsx
12. **Переводы** — ru/en/tt (каждый язык в свой файл)
13. **Тесты** — 12 новых тест-кейсов
14. **Документация** — features.md

---

## Формат экспортируемого JSON (обновлённый)

```json
{
  "version": "1.0",
  "app": "todowka",
  "exported_at": "2026-06-05T12:00:00+00:00",
  "data": {
    "areas": [...],
    "contexts": [...],
    "tags": [...],
    "verb_templates": [...],
    "calendar_events": [...],
    "projects": [...],
    "tasks": [...],
    "checklist_items": [...],
    "task_recurrences": [...],
    "event_recurrences": [...],
    "task_tags": [...]
  }
}
```

**Обратная совместимость:** при импорте старых файлов (без calendar_events/event_recurrences) — эти ключи просто не обрабатываются (`data.get("calendar_events", [])` → пустой список). `event_id` в Task — опциональное поле, при отсутствии остаётся `None`.

---

## Риски и ограничения

- **Старые файлы без calendar_events**: обратная совместимость через `data.get("calendar_events", [])` — работает
- **Старые файлы без event_id в Task**: поле опционально, при отсутствии — None (как сейчас)
- **Race condition**: существующий asyncio.Lock по user_id продолжает работать
- **Telegram-бэкапы**: BackupScheduleService использует ExportImportService.export_data() — автоматически начнёт включать CalendarEvent
- **Размер файла**: CalendarEvent с attendees (JSON) может увеличить размер файла, но 50MB лимит достаточен
- **EventRecurrence на фронтенде**: EventRecurrence — серверная сущность, не синхронизируется в Dexie (нет в syncEngine RESOURCES, нет таблицы). При `performInitialSync` она не скачается на клиент. Это нормально — фронтенд получает EventRecurrence только по API `/calendar-events/{id}/recurrences` при просмотре конкретного события. Импорт создаёт их на сервере, и они доступны через API
- **Duplicate-режим + дубликаты**: при duplicate-импорте появятся задачи с одинаковыми названиями — пользователь видит это через toast «Импортировано N дубликатов»
- **Replace-режим + чужой файл**: если UUID из чужого файла совпадает с UUID существующих данных пользователя — данные перезапишутся. UI предупреждает: «Совпадающие записи будут перезаписаны данными из файла»
- **performInitialSync сразу после импорта**: вызывается немедленно, до любого другого действия пользователя. Это гарантирует что локальная Dexie-БД актуальна. Другие вкладки получают SSE `data_imported` и тоже синхронизируются
