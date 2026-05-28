### L7-01 — Тесты: Telegram Auth полный флоу (HMAC → login → authenticated request)

**Goal:** Интеграционный тест полного цикла Telegram авторизации.
**Input:** Исправленный telegram_auth_service, telegram_auth API.
**Output:** Тесты в `backend/tests/`.
**Done when:** Все сценарии покрыты: валидный/невалидный HMAC, истёкший auth_date, заблокированный пользователь.
**Acceptance criteria:**
- [ ] Тест HMAC-валидации с правильной подписью → успех
- [ ] Тест HMAC-валидации с неправильной подписью → отказ
- [ ] Тест auth_date старше 5 минут → отказ
- [ ] Тест login с привязанным пользователем → access_token
- [ ] Тест login с непривязанным пользователем → ошибка
- [ ] Тест rate limiting на всех эндпоинтах
- [ ] Тест logout → токен инвалидирован
**depends_on:** [L2/01, L3/01, L3/02, L3/03, L3/05, L4/02]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** 6.0
**Est. effort:** M
