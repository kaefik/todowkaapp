### L7-02 — Написать тест авторизации API с cookie и header

**Goal:** Создать интеграционный тест для проверки авторизации через cookie и Authorization header.
**Input:** Бэкенд тесты, файлы `backend/app/dependencies.py`, `backend/app/security.py`
**Output:** Тестовый файл `backend/tests/test_auth.py` с тестами авторизации
**Done when:** Тест проверяет что API корректно обрабатывает авторизацию через cookie и header.
**Acceptance criteria:**
- [ ] Создан тестовый файл test_auth.py (или добавлен в существующий)
- [ ] Тест проверяет успешную авторизацию через cookie
- [ ] Тест проверяет успешную авторизацию через Authorization header
- [ ] Тест проверяет что 401 возвращается без авторизации
- [ ] Тест проверяет что 401 возвращается с недействительным токеном
- [ ] Тест проверяет что secure cookie правильно устанавливается в зависимости от окружения
**depends_on:** [L3/01, L4/01]
**impact:** 3 (обеспечивает надежность авторизации)
**complexity:** 3 (требует настройки тестового клиента FastAPI)
**risk:** 1 (безопасно, только тесты)
**priority_score:** (3 × 2 + 1) / 3 = 2.33
**Est. effort:** M (2h)
**LLM Prompt Hint:** Создайте или обновите backend/tests/test_auth.py. Используйте TestClient из FastAPI. Напишите тесты:
1. test_auth_with_cookie: создайте пользователя, установите cookie в response, сделайте запрос с этим cookie
2. test_auth_with_header: создайте токен, добавьте Authorization header, сделайте запрос
3. test_no_auth: запрос без авторизации должен вернуть 401
4. test_invalid_token: запрос с неверным токеном должен вернуть 401
5. test_cookie_secure: проверьте что cookie имеет правильный флаг secure для dev и prod
Используйте pytest fixtures для создания тестовых пользователей.
