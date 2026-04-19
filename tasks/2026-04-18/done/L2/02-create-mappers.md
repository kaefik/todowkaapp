### L2-02 — Создать mappers.ts (dbTaskToUi, apiTaskToDb, UiTask)

**Goal:** Создать мапперы между Dexie-записями и UI-типами для бесшовной замены React Query.
**Input:** Завершённый L1-01 (типы DbTask, db), текущий тип `Tag` из `useTags.ts`.
**Output:** Файл `frontend/src/db/mappers.ts` с интерфейсом `UiTask` и функциями `dbTaskToUi()`, `apiTaskToDb()`.
**Done when:** Файл создан, TypeScript компилируется.
**Acceptance criteria:**
- [ ] `UiTask` интерфейс совместим с текущим `Task` из `useTasks.ts` (поля `gtd_status`, `is_completed` → `completed`, snake_case)
- [ ] `dbTaskToUi(task: DbTask)` выполняет join: tagIds → Tag[], projectId → project, contextId → context
- [ ] `dbTaskToUi` вычисляет `subtasks_count` и `subtasks_completed` динамически из `db.tasks.where('parentTaskId')`
- [ ] `apiTaskToDb(apiTask, userId)` конвертирует API-ответ в DbTask для записи при pull
- [ ] `apiTaskToDb` устанавливает `_syncStatus: 'synced'` и `_lastSyncedAt: new Date().toISOString()`
- [ ] JSON.parse/stringify для `recurrenceConfig` и `reminderOffsets` (string в Dexie ↔ object в UI)
**depends_on:** [L1/01]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** 6.0
**Est. effort:** S
**LLM Prompt Hint:** "Create frontend/src/db/mappers.ts following the design document. Include UiTask interface matching current Task type, dbTaskToUi() with joins for tags/project/context and dynamic subtask counts, apiTaskToDb() for converting API responses to DbTask format."
