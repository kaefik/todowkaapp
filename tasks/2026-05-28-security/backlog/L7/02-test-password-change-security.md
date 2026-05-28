### L7-02 — Тесты: Смена пароля только через /auth/change-password

**Goal:** Тест что PATCH /users/me не принимает password.
**Input:** Исправленный UserUpdate.
**Output:** Тест в `backend/tests/`.
**Acceptance criteria:**
- [ ] PATCH /users/me с `password` полем → 422 или игнорируется
- [ ] POST /auth/change-password без current_password → 400
- [ ] POST /auth/change-password с правильным current_password → успех
**depends_on:** [L3/04]
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
