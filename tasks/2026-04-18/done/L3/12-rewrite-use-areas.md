### L3-12 — Переписать useAreas на useDexieQuery + CRUD

**Goal:** Заменить React Query в useAreas на Dexie.
**Input:** Завершённые L1-01, L3-01. Текущий `frontend/src/hooks/useAreas.ts`.
**Output:** Переписанный `frontend/src/hooks/useAreas.ts`.
**Done when:** Хук работает с Dexie. CRUD через мутации.
**Acceptance criteria:**
- [ ] `useAreas()` использует `useDexieQuery` + `activeTable(db.areas, userId)`
- [ ] `addArea()`, `updateArea()`, `deleteArea()` — через Dexie + `db.mutations`
- [ ] Soft-delete для `deleteArea`
- [ ] Тот же return интерфейс `UseAreasReturn`
- [ ] Экспортирует `areaKeys` (заглушка)
**depends_on:** [L1/01, L3/01]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S
