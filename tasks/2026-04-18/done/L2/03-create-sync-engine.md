### L2-03 — Создать syncEngine.ts (initialSync, push, pull)

**Goal:** Реализовать полный SyncEngine для синхронизации данных между Dexie и бекендом.
**Input:** Завершённые L1-01, L2-01, L2-02. `httpClient` для HTTP-запросов.
**Output:** Файл `frontend/src/db/syncEngine.ts` с функциями `initialSync()`, `push()`, `pull()`.
**Done when:** Файл создан, TypeScript компилируется.

<!-- WARNING: effort=L (4h+). Not split because it's one cohesive file with provided code in design doc. -->

**Acceptance criteria:**
- [ ] `initialSync(userId)` — GET всех 5 ресурсов с пагинацией, каждая запись → `mergeRecord` → `db.table.put()`, skip если `shouldSkipMerge`
- [ ] `push()` — берёт мутации из `db.mutations` ORDER BY timestamp, мержит дубли (create+delete → удалить обе), отправляет POST/PUT/PATCH/DELETE
- [ ] Push error handling: 401 → refresh + retry, 404 → удалить локально, 422 → log + skip, 500 → retry ×3 backoff, network → stop
- [ ] `pull(userId)` — GET всех ресурсов, merge через `mergeRecord`, skip если `shouldSkipMerge`
- [ ] После push → pull
- [ ] Обновляет `_syncStatus='synced'` и `_lastSyncedAt` при успехе
- [ ] Обрабатывает `QuotaExceededError` — toast + stop sync
**depends_on:** [L1/01, L2/01, L2/02]
**impact:** 5
**complexity:** 4
**risk:** 4
**priority_score:** 3.5
**Est. effort:** L
**LLM Prompt Hint:** "Create frontend/src/db/syncEngine.ts following the design document's SyncEngine protocol. Implement initialSync(userId), push(), and pull(userId). Use httpClient for API calls, db for Dexie operations, mergeRecord and shouldSkipMerge from conflictResolution. Handle all error cases from the design doc."
