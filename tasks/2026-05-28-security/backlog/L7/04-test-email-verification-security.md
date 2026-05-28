### L7-04 — Тесты: Email verification brute force + expiry

**Goal:** Тесты защиты от перебора и срока действия кода.
**Input:** Исправленные эндпоинты.
**Output:** Тесты в `backend/tests/`.
**Acceptance criteria:**
- [ ] Тест 5 неверных попыток → код инвалидирован
- [ ] Тест просроченный код → отказ
- [ ] Тест корректный код → успех
- [ ] Тест rate limiting на /confirm-email
**depends_on:** [L4/04, L6/01]
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
