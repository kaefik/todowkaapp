### L7-01 — Обновить backend-тесты для cookie-based аутентификации

**Goal:** Переписать тесты чтобы отправляли access_token через cookie вместо Authorization header. Убрать проверки `access_token` в JSON-ответе.

**Input:** `backend/tests/test_auth.py` (484 строки, 17+ тестов)

**Output:** Обновлённый `backend/tests/test_auth.py` — все тесты используют cookie для авторизации.

**Done when:** `pytest tests/test_auth.py -v` — все тесты PASS. Нет проверок `data["access_token"]`.

**Acceptance criteria:**
- [ ] `test_login_valid_credentials`: убрать `"access_token" in data` и `data["token_type"]`, проверять только `data["user"]`
- [ ] `test_refresh_token_flow`: убрать `initial_access_token = login_response.json()["access_token"]`, refresh через cookie
- [ ] `test_me_returns_current_user`: отправлять `cookies={"access_token": token}` вместо Authorization header
- [ ] `test_me_invalid_token`: отправлять invalid token через cookie
- [ ] `test_cookie_secure_flag_in_production`: использовать cookie вместо `login_response.json()['access_token']`
- [ ] `test_cookie_secure_flag_in_development`: аналогично
- [ ] `test_cookie_secure_override_via_env`: аналогично
- [ ] Принцип: `access_token` отправляется через `cookies={"access_token": token}`, не через Authorization header
- [ ] Backend устанавливает cookie при login — тесты могут читать из `response.cookies`
- [ ] Все 17+ тестов PASS

**depends_on:** [L3-02, L4-02]

**impact:** 5
**complexity:** 3
**risk:** 4
**priority_score:** 4.67
**Est. effort:** M

**LLM Prompt Hint:** Обнови test_auth.py: вместо Authorization header используй cookies={"access_token": token}. Убери проверки access_token в JSON-ответе. Тесты login/refresh не должны ожидать access_token в body — только user. Cookie читается из response.cookies.
