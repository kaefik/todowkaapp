### L5-02 — Обработка logout — очистка Dexie по userId

**Goal:** Интегрировать очистку Dexie при выходе пользователя из системы.
**Input:** Завершённый L5-01. Текущий `frontend/src/stores/authStore.ts`.
**Output:** Обновлённый `authStore.ts` с вызовом `clearLocalData()` при logout.
**Done when:** При logout все локальные данные пользователя удаляются из IndexedDB.
**Acceptance criteria:**
- [ ] `authStore.logout()` вызывает `clearLocalData(userId)` перед очисткой стора
- [ ] Очищаются: db.tasks, db.projects, db.areas, db.contexts, db.tags, db.mutations, db.syncMeta по userId
- [ ] После logout Dexie пуста для данного пользователя
- [ ] TypeScript компилируется
**depends_on:** [L5/01]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
