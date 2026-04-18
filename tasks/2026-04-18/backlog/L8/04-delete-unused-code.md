### L8-04 — Удалить неиспользуемый код

**Goal:** Удалить файлы, заменённые Dexie инфраструктурой.
**Input:** Завершённые L3 задачи.
**Output:** Удалённые файлы.
**Done when:** Все файлы удалены, `npm run build` без ошибок.
**Acceptance criteria:**
- [ ] Удалён `frontend/src/hooks/useOfflineQueue.ts`
- [ ] Удалён `frontend/src/hooks/useLocalTaskChanges.ts`
- [ ] Удалён `frontend/src/lib/localTaskChanges.ts`
- [ ] Удалён `frontend/src/lib/indexedDB.ts`
- [ ] Удалён `frontend/src/services/sseSyncManager.ts`
- [ ] Удалён `frontend/src/stores/syncStore.ts`
- [ ] Удалён `frontend/src/hooks/useSyncSSE.ts`
- [ ] Нет import этих файлов в оставшемся коде
- [ ] `npm run build` проходит
**depends_on:** [L3/02, L3/06, L3/07, L8/03]
**impact:** 3
**complexity:** 1
**risk:** 2
**priority_score:** 8.0
**Est. effort:** S
