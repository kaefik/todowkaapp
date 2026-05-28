### L3-05 — Реализовать telegram_logout — инвалидация + cookies (T-07)

**Goal:** telegram_logout реально инвалидирует токен и очищает cookies.
**Input:** `backend/app/api/telegram_auth.py:81-84`.
**Output:** Logout инвалидирует access_token и очищает cookies.
**Done when:** После logout запросы с старым токеном отклоняются.
**Acceptance criteria:**
- [ ] `telegram_logout` добавляет токен в `RevokedToken` или устанавливает короткий TTL
- [ ] Очищает access_token cookie
- [ ] Требует авторизацию (`Depends(get_current_user)`)
**depends_on:** [L3/02]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
