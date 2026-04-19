### L3-05 — Переписать useSubtasks на useLiveQuery

**Goal:** Переписать хук подзадач на чтение из Dexie с реактивными обновлениями.
**Input:** Завершённые L1-01, L2-02, L3-01. Текущий `frontend/src/hooks/useSubtasks.ts`.
**Output:** Переписанный `frontend/src/hooks/useSubtasks.ts`.
**Done when:** Подзадачи загружаются из Dexie, CRUD операции пишут в Dexie + mutations.
**Acceptance criteria:**
- [ ] `useSubtasks(parentTaskId)` использует `useDexieQuery` для загрузки подзадач
- [ ] Запрос: `db.tasks.where('parentTaskId').equals(parentTaskId).filter(t => t._syncStatus !== 'deleted').toArray()`
- [ ] Каждая запись маппится через `dbTaskToUi()`
- [ ] `addSubtask()` — создаёт в Dexie с `parentTaskId`, `_syncStatus: 'local'`, мутация `create`
- [ ] `toggleSubtask()` — переключает `isCompleted` в Dexie, мутация `toggle`
- [ ] `deleteSubtask()` — soft-delete в Dexie, мутация `delete`
- [ ] Сохраняет тот же return интерфейс
**depends_on:** [L1/01, L2/02, L3/01]
**impact:** 3
**complexity:** 2
**risk:** 2
**priority_score:** 4.0
**Est. effort:** S
