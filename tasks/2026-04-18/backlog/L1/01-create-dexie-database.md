### L1-01 — Создать Dexie database.ts (схема, типы, хелперы запросов)

**Goal:** Создать локальную базу данных на IndexedDB через Dexie.js со всеми таблицами, типами и хелперами для soft-delete.
**Input:** Дизайн-документ `docs/plans/offline/2026-04-18-offline-v3.md` (секция "Dexie-схема"), установленный `dexie` (L0-01).
**Output:** Файл `frontend/src/db/database.ts` с классом `TodowkaDB`, инстансом `db`, типами `DbTask`, `DbProject`, `DbArea`, `DbContext`, `DbTag`, `DbMutation`, `DbSyncMeta`, `SyncStatus`, и хелперами `activeTasks`, `activeTasksByStatus`, `activeTasksByProject`, `activeTable`.
**Done when:** Файл создан, `npx tsc --noEmit` не показывает ошибок в этом файле.
**Acceptance criteria:**
- [ ] Все 7 таблиц определены: tasks, projects, areas, contexts, tags, mutations, syncMeta
- [ ] Все интерфейсы имеют поля `_syncStatus: SyncStatus` и `_lastSyncedAt: string | null`
- [ ] Compound индексы: `[userId+gtdStatus]`, `[userId+projectId]`, `[userId+contextId]`, `[userId+areaId]`
- [ ] Хелперы `activeTasks`, `activeTasksByStatus`, `activeTasksByProject`, `activeTable` фильтруют по `_syncStatus !== 'deleted'`
- [ ] Экспортируется singleton `db = new TodowkaDB()`
- [ ] TypeScript компилируется без ошибок
**depends_on:** [L0/01]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** 6.0
**Est. effort:** S
**LLM Prompt Hint:** "Create frontend/src/db/database.ts following the exact code from the design document. Include TodowkaDB class, all interfaces (DbTask, DbProject, DbArea, DbContext, DbTag, DbMutation, DbSyncMeta), SyncStatus type, and query helper functions (activeTasks, activeTasksByStatus, activeTasksByProject, activeTable). Use Dexie.js."
