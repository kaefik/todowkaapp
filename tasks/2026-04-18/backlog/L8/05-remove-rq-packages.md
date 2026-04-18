### L8-05 — Удалить пакеты React Query и idb из package.json

**Goal:** Удалить неиспользуемые npm-пакеты.
**Input:** Завершённые L8-01..04.
**Output:** Обновлённый `frontend/package.json` + `package-lock.json`.
**Done when:** `npm ls @tanstack/react-query` показывает "not found". `npm run build` проходит.
**Acceptance criteria:**
- [ ] Удалены: `@tanstack/react-query`, `@tanstack/react-query-devtools`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `@tanstack/query-sync-storage-persister`
- [ ] Удалён: `idb`
- [ ] `npm run build` проходит
- [ ] `npm run lint` проходит
**depends_on:** [L8/01, L8/02, L8/03, L8/04]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
