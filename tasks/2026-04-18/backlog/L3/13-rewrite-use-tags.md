### L3-13 — Переписать useTags на useDexieQuery + CRUD

**Goal:** Заменить React Query в useTags на Dexie.
**Input:** Завершённые L1-01, L3-01. Текущий `frontend/src/hooks/useTags.ts`.
**Output:** Переписанный `frontend/src/hooks/useTags.ts`.
**Done when:** Хук работает с Dexie. CRUD через мутации.
**Acceptance criteria:**
- [ ] `useTags()` использует `useDexieQuery` + `activeTable(db.tags, userId)`
- [ ] `addTag()`, `updateTag()`, `deleteTag()` — через Dexie + `db.mutations`
- [ ] Soft-delete для `deleteTag`
- [ ] Тот же return интерфейс `UseTagsReturn`
- [ ] Интерфейс `Tag` остаётся без изменений (используется в mappers)
- [ ] Экспортирует `tagKeys` (заглушка)
**depends_on:** [L1/01, L3/01]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S
