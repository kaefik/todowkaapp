### L5-14 — Frontend: session_id в authStore

**Goal:** Добавить хранение session_id в Zustand authStore (memory only, не persist).

**Input:** `frontend/src/stores/authStore.ts`. Backend возвращает `session_id` в login response (L3-11).

**Output:** Обновлённый authStore с полем `sessionId`.

**Done when:** session_id сохраняется при логине, доступен для сравнения.

**Acceptance criteria:**
- [ ] Новое поле `sessionId: string | null` в authStore (state)
- [ ] НЕ включено в `partialize` (не persist в localStorage)
- [ ] `login()` сохраняет `response.session_id` в `set({ sessionId: ... })`
- [ ] `logout()` очищает `set({ sessionId: null })`
- [ ] API тип login response обновлён: `{ session_id?: string }`

**depends_on:** [L3-11]

**impact:** 4 | **complexity:** 1 | **risk:** 1
**priority_score:** 7.5
**Est. effort:** XS (~30min)
