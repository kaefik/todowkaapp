### L3-03 — Переписать useTask (одна задача) на useDexieQuery + joins

**Goal:** Переписать хук `useTask(id)` на чтение из Dexie с join tags/project/context.
**Input:** Завершённый L3-02 (тот же файл `useTasks.ts`).
**Output:** Обновлённая функция `useTask()` в `frontend/src/hooks/useTasks.ts`.
**Done when:** `useTask(id)` возвращает задачу из Dexie с join tags/project/context и динамическими subtasks.
**Acceptance criteria:**
- [ ] `useTask(id)` использует `useDexieQuery` вместо `useQuery`
- [ ] Получает `DbTask` из `db.tasks.get(id)`, маппит через `dbTaskToUi()`
- [ ] Возвращает `{ data: UiTask | null, isLoading: boolean, error: ... }`
- [ ] Убирает `getLocalTaskChange` / `mergeTaskWithLocalChanges` (больше не нужны — Dexie источник истины)
- [ ] Enabled только если `!!id`
**depends_on:** [L3/02]
**impact:** 4
**complexity:** 2
**risk:** 2
**priority_score:** 5.0
**Est. effort:** S
