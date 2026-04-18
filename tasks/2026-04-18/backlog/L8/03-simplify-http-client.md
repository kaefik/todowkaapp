### L8-03 — Упростить httpClient.ts — убрать offline queue, GET cache, toasts

**Goal:** Упростить HTTP клиент, убрав функциональность, заменённую Dexie.
**Input:** Завершённый L8-01. Текущий `frontend/src/api/httpClient.ts`.
**Output:** Упрощённый `frontend/src/api/httpClient.ts`.
**Done when:** httpClient содержит только: JWT auth, 401 refresh, ApiError, HTTP методы. Без offline queue, cache, toasts.
**Acceptance criteria:**
- [ ] Убраны: `queueMutationFn`, `setQueueMutationFn`, `OfflineQueueError`
- [ ] Убраны: `getCache`, `setCache` imports из `../lib/indexedDB`
- [ ] Убраны: online/offline toast логика, `hasShownOfflineToast`, `hasShownQueueToast`
- [ ] Убраны: `BACKEND_RECOVERED` handler, `ONLINE_RECONNECT` dispatch
- [ ] Остаётся: `ApiError`, `fetchWithAuth` с JWT + 401 refresh, все HTTP методы
- [ ] Убраны: window.addEventListener('online'/'offline') блоки с toast логикой
- [ ] `npm run build` проходит
**depends_on:** [L8/01]
**impact:** 4
**complexity:** 2
**risk:** 3
**priority_score:** 5.5
**Est. effort:** S
