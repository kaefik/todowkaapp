# Export/Import Design Spec

**Date:** 2026-04-29
**Status:** Approved
**Approach:** Backend API + frontend via API with offline fallback

## Overview

Add export/import functionality for all user data in JSON format. Export serializes all user entities to a downloadable JSON file. Import reads a JSON file and performs upsert (create or update) respecting FK dependency order.

## JSON Format

```json
{
  "version": "1.0",
  "app": "todowka",
  "exported_at": "2026-04-29T12:00:00Z",
  "data": {
    "areas": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string | null",
        "color": "string | null",
        "sort_order": 0,
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "contexts": [
      {
        "id": "uuid",
        "name": "string",
        "color": "string | null",
        "icon": "string | null",
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "tags": [
      {
        "id": "uuid",
        "name": "string",
        "color": "string | null",
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "verb_templates": [
      {
        "id": "uuid",
        "text": "string",
        "icon": "string",
        "position": 0,
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "projects": [
      {
        "id": "uuid",
        "area_id": "uuid | null",
        "name": "string",
        "description": "string | null",
        "color": "string | null",
        "is_active": true,
        "sort_order": 0,
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "tasks": [
      {
        "id": "uuid",
        "title": "string",
        "description": "string | null",
        "is_completed": false,
        "completed_at": "ISO8601 | null",
        "gtd_status": "inbox",
        "context_id": "uuid | null",
        "area_id": "uuid | null",
        "project_id": "uuid | null",
        "position": 0,
        "due_date": "ISO8601 | null",
        "notes": "string | null",
        "recurrence_type": "string | null",
        "recurrence_config": "{} | null",
        "recurrence_end_date": "ISO8601 | null",
        "reminder_time": "HH:MM:SS | null",
        "reminder_offsets": "[] | null",
        "reminder_fired": false,
        "deadline_notified": false,
        "trashed_at": "ISO8601 | null",
        "created_at": "ISO8601",
        "updated_at": "ISO8601",
        "tag_ids": ["uuid"]
      }
    ],
    "checklist_items": [
      {
        "id": "uuid",
        "task_id": "uuid",
        "title": "string",
        "is_completed": false,
        "position": 0,
        "completed_at": "ISO8601 | null",
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "task_recurrences": [
      {
        "id": "uuid",
        "task_id": "uuid",
        "generated_task_id": "uuid",
        "due_date_of_generated_task": "ISO8601",
        "generated_at": "ISO8601",
        "status": "completed"
      }
    ],
    "task_tags": [
      { "task_id": "uuid", "tag_id": "uuid" }
    ]
  }
}
```

### Serialization rules

- `user_id` is excluded from export; set to current user on import
- UUIDs preserved as-is
- Datetime fields: ISO 8601 UTC string
- JSON fields (recurrence_config, reminder_offsets): native JSON
- `sent_reminder_offsets` and `last_reminder_sent_at` excluded from export (ephemeral reminder state)
- Tags on tasks serialized both as `tag_ids` array in task object and as `task_tags` array (for consistency)

### Excluded from export

- User account data (password, email, settings)
- Notifications
- Revoked tokens
- Ephemeral state (sent_reminder_offsets, last_reminder_sent_at)

## Backend API

### New files

- `backend/app/services/export_import_service.py` — ExportImportService
- `backend/app/api/export_import.py` — router with 2 endpoints
- `backend/app/schemas/export_import.py` — Pydantic schemas

### Endpoints

#### GET /api/export

- **Auth:** required
- **Response:** JSON file download
- **Headers:** `Content-Disposition: attachment; filename="todowka_export_YYYY-MM-DD.json"`
- **Logic:**
  1. Query all user entities: areas, contexts, tags, verb_templates, projects, tasks, checklist_items, task_recurrences
  2. Query task_tags junction table for user's tasks
  3. Serialize each entity (exclude user_id, ephemeral fields)
  4. Build export envelope with version/app/exported_at
  5. Return as JSON response with download headers

#### POST /api/import

- **Auth:** required
- **Content-Type:** multipart/form-data
- **Body:** file field with JSON
- **Response:**
  ```json
  {
    "imported": {
      "areas": 0,
      "contexts": 0,
      "tags": 0,
      "verb_templates": 0,
      "projects": 0,
      "tasks": 0,
      "checklist_items": 0,
      "task_recurrences": 0,
      "task_tags": 0
    },
    "skipped": 0,
    "errors": ["string"]
  }
  ```
- **Logic:**
  1. Parse and validate JSON structure (version, app, data)
  2. Import in FK order:
     - Phase 1 (no FK): areas, contexts, tags, verb_templates
     - Phase 2 (depends on areas): projects
     - Phase 3 (depends on contexts/areas/projects): tasks
     - Phase 4 (depends on tasks): checklist_items, task_recurrences
     - Phase 5 (M:N): task_tags
  3. For each entity: upsert (if UUID exists for this user, update; else create with user_id = current user)
  4. Skip records with FK references to non-existent entities (neither in file nor in DB)
  5. Skip task_tags where task_id or tag_id doesn't exist for this user
  6. Skip task_recurrences where task_id or generated_task_id doesn't exist
  7. All operations in a single database transaction (rollback on critical error)
  8. Return import report

### Upsert strategy

```python
# For each entity in import order:
existing = await session.get(Entity, entity_id)
if existing and existing.user_id == current_user_id:
    # Update: set all fields from import data
    for key, value in data.items():
        setattr(existing, key, value)
else:
    # Create new with user_id = current user
    new_entity = Entity(**data, user_id=current_user_id)
    session.add(new_entity)
```

### Validation

- File must be valid JSON
- Must have `version: "1.0"` and `app: "todowka"`
- Must have `data` object with expected keys (at minimum empty arrays)
- Max file size: 50MB

## Frontend

### New files

- `frontend/src/api/exportImport.ts` — API client

### Modified files

- `frontend/src/routes/Settings.tsx` — add export/import buttons in "Data Management" section
- `frontend/src/i18n/locales/ru/settings.json` — add i18n keys
- `frontend/src/i18n/locales/en/settings.json` — add i18n keys

### API client (exportImport.ts)

```typescript
export const exportImportApi = {
  async exportData(): Promise<Blob>,
  async importData(file: File): Promise<ImportReport>,
}
```

### Settings UI

In the existing "Data Management" card (Settings.tsx, line 491), add:

- "Export data" button: calls API, downloads result as file
- "Import data" button: opens file picker (accept .json), calls API, shows result toast
- Confirmation dialog before import
- After successful import: trigger `performInitialSync(userId)` to sync Dexie

### Offline fallback

When `!navigator.onLine`:

- **Export:** serialize from Dexie tables to same JSON format, trigger download
- **Import:** parse JSON, write to Dexie with `_syncStatus: 'local'`, SyncEngine will push changes when back online

### i18n keys

**Russian (ru/settings.json):**
- `exportData`: "Экспорт данных"
- `importData`: "Импорт данных"
- `exportDescription`: "Скачать все ваши данные в JSON файл"
- `importDescription`: "Загрузить данные из JSON файла. Существующие записи будут обновлены, новые — добавлены."
- `exporting`: "Экспорт..."
- `importing`: "Импорт..."
- `exportSuccess`: "Данные успешно экспортированы"
- `importSuccess`: "Импортировано: задач — {{tasks}}, проектов — {{projects}}"
- `importError`: "Ошибка при импорте данных"
- `confirmImport`: "Импортировать данные? Существующие записи будут обновлены."

**English (en/settings.json):**
- `exportData`: "Export data"
- `importData`: "Import data"
- `exportDescription`: "Download all your data as a JSON file"
- `importDescription`: "Upload data from a JSON file. Existing records will be updated, new ones will be added."
- `exporting`: "Exporting..."
- `importing`: "Importing..."
- `exportSuccess`: "Data exported successfully"
- `importSuccess`: "Imported: tasks — {{tasks}}, projects — {{projects}}"
- `importError`: "Failed to import data"
- `confirmImport`: "Import data? Existing records will be updated."

## Error handling

- Invalid JSON file: 400 with descriptive message
- Wrong format (missing version/app): 400
- File too large (>50MB): 413
- FK reference to non-existent entity: skip record, add to skipped count
- Database error during import: rollback transaction, return 500 with partial report
- Network error on frontend: fall back to Dexie offline mode

## Testing

- Backend: pytest tests for ExportImportService (export serialization, import upsert, FK skip, validation)
- Frontend: test export/import buttons render, API calls made correctly
