### L5-03 — Обновить authStore.ts — убрать accessToken и localStorage

**Goal:** Удалить поле `accessToken` из состояния, убрать все `localStorage.setItem/removeItem('accessToken')`. Токен хранится только в httpOnly cookie.

**Input:** `frontend/src/stores/authStore.ts` (строки 17, 40–81, 119–180, 182–200, 202–231, 237–290, 296–303)

**Output:** Обновлённый `frontend/src/stores/authStore.ts` — нет `accessToken` в state, нет `localStorage` для токена.

**Done when:** В localStorage нет `accessToken` (только `auth-storage` с `user` и `isAuthenticated`). `npx tsc --noEmit` без ошибок.

**Acceptance criteria:**
- [ ] Поле `accessToken` удалено из `AuthState` интерфейса
- [ ] Все `localStorage.setItem('accessToken', ...)` удалены
- [ ] Все `localStorage.removeItem('accessToken')` удалены
- [ ] В `persist` `partialize`: только `{ user, isAuthenticated }`
- [ ] `login()`: state = `{ user: data.user, isAuthenticated: true, isLoading: false, error: null }`
- [ ] `registerAndLogin()`: аналогично
- [ ] `refreshToken()`: аналогично, без обновления accessToken
- [ ] `fetchCurrentUser()`: аналогично, без accessToken
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run lint` без ошибок

**depends_on:** [L3-02, L5-02]

**impact:** 5
**complexity:** 3
**risk:** 4
**priority_score:** 4.67
**Est. effort:** S

**LLM Prompt Hint:** В authStore.ts удали поле accessToken из AuthState, все localStorage.setItem/removeItem('accessToken'). В partialize оставь только { user, isAuthenticated }. Обнови login, registerAndLogin, refreshToken, fetchCurrentUser — не читать data.access_token.
