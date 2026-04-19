### L3-11 — Переписать useContexts на useDexieQuery + CRUD

**Goal:** Заменить React Query в useContexts на Dexie с локальным CRUD и soft-delete.
**Input:** Завершённые L1-01, L3-01. Текущий `frontend/src/hooks/useContexts.ts`.
**Output:** Переписанный `frontend/src/hooks/useContexts.ts`.
**Done when:** Хук работает с Dexie. CRUD операции записывают мутации. TypeScript компилируется.
**Acceptance criteria:**
- [ ] `useContexts()` использует `useDexieQuery` + `activeTable(db.contexts, userId)` + маппинг
- [ ] `addContext()` — `uuidv4()`, `db.contexts.put()`, `_syncStatus: 'local'`, мутация `create`
- [ ] `updateContext()` — `db.contexts.update()`, `_syncStatus: 'modified'`, мутация `update`
- [ ] `deleteContext()` — soft-delete `_syncStatus: 'deleted'`, мутация `delete`
- [ ] Сохраняет тот же return интерфейс `UseContextsReturn`
- [ ] Экспортирует `contextKeys` (заглушка для совместимости)
**depends_on:** [L1/01, L3/01]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S
