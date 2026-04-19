### L3-14 — Переписать useProjects на useDexieQuery + CRUD

**Goal:** Заменить React Query в useProjects на Dexie.
**Input:** Завершённые L1-01, L3-01. Текущий `frontend/src/hooks/useProjects.ts`.
**Output:** Переписанный `frontend/src/hooks/useProjects.ts`.
**Done when:** Хук работает с Dexie. CRUD через мутации.
**Acceptance criteria:**
- [ ] `useProjects()` использует `useDexieQuery` + `activeTable(db.projects, userId)`
- [ ] `addProject()`, `updateProject()`, `deleteProject()` — через Dexie + `db.mutations`
- [ ] Soft-delete для `deleteProject`
- [ ] Тот же return интерфейс `UseProjectsReturn`
- [ ] `ProjectProgress` убран — не хранится локально (можно добавить позже при необходимости)
- [ ] Экспортирует `projectKeys` (заглушка)
**depends_on:** [L1/01, L3/01]
**impact:** 4
**complexity:** 2
**risk:** 2
**priority_score:** 5.0
**Est. effort:** S
