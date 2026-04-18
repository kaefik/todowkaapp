### L3-02 — Переписать useTasks на useDexieQuery + локальный CRUD

**Goal:** Заменить React Query в useTasks на Dexie. Все операции (CRUD, toggle, move) пишут напрямую в Dexie + логируют мутации для sync.
**Input:** Завершённые L1-01, L2-02, L3-01. Текущий `frontend/src/hooks/useTasks.ts`.
**Output:** Переписанный `frontend/src/hooks/useTasks.ts`.
**Done when:** Хук работает с Dexie. Все CRUD операции записывают мутации в `db.mutations`. TypeScript компилируется.
**Acceptance criteria:**
- [ ] `useTasks(filters?)` использует `useDexieQuery` вместо `useQuery`
- [ ] Чтение: `activeTasks(userId)` + фильтрация + `dbTaskToUi()` для каждой записи
- [ ] `addTask()` — генерирует `uuidv4()`, записывает в `db.tasks` с `_syncStatus: 'local'`, записывает мутацию `{action: 'create'}`
- [ ] `updateTask()` — обновляет в `db.tasks`, `_syncStatus: 'modified'`, мутация `{action: 'update', payload}`
- [ ] `toggleTask()` — переключает `isCompleted`, мутация `{action: 'toggle'}`
- [ ] `moveTask()` — меняет `gtdStatus`, мутация `{action: 'move'}`
- [ ] `deleteTask()` — soft-delete: `_syncStatus: 'deleted'`, мутация `{action: 'delete'}`
- [ ] Все мутации записывают `timestamp: Date.now()`, `retryCount: 0`
- [ ] Сохраняет обратную совместимость: тот же return type `UseTasksReturn`
- [ ] Экспортирует `taskKeys` (заглушка для совместимости, уберётся в L8)
**depends_on:** [L1/01, L2/02, L3/01, L0/02]
**impact:** 5
**complexity:** 3
**risk:** 3
**priority_score:** 4.33
**Est. effort:** M
**LLM Prompt Hint:** "Rewrite frontend/src/hooks/useTasks.ts to use Dexie instead of React Query. Use useDexieQuery for reading, write directly to db.tasks + db.mutations for all CRUD operations. Import db, activeTasks, dbTaskToUi from db/. Use uuid for generating IDs. Keep the same return interface."
