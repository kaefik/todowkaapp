### L3-02 — Обновить login/refresh эндпоинты (не возвращать токен в теле)

**Goal:** Изменить `/login` и `/refresh` чтобы возвращали `TokenResponse(user=user)` без access_token в JSON-ответе.

**Input:**
- `backend/app/api/auth.py` (строка 128: `return TokenResponse(access_token=access_token, user=user)` в login)
- `backend/app/api/auth.py` (строка 200: `return TokenResponse(access_token=access_token, user=user)` в refresh)

**Output:** Обновлённый `backend/app/api/auth.py` — login и refresh возвращают `TokenResponse(user=user)`.

**Done when:** POST `/api/auth/login` возвращает `{"user": {...}}` без `access_token` и `token_type`. Cookie устанавливается.

**Acceptance criteria:**
- [ ] В `login()`: `return TokenResponse(user=user)` (без `access_token=`)
- [ ] В `refresh()`: `return TokenResponse(user=user)` (без `access_token=`)
- [ ] Cookie устанавливаются как раньше (set_access_cookie, set_refresh_cookie)
- [ ] Переменная `access_token` больше не нужна в ответе, но создаётся для cookie
- [ ] `ruff check backend/app/api/auth.py` без ошибок

**depends_on:** [L3-01]

**impact:** 5
**complexity:** 2
**risk:** 4
**priority_score:** 7.0
**Est. effort:** S

**LLM Prompt Hint:** В api/auth.py обнови login и refresh: вместо TokenResponse(access_token=access_token, user=user) верни TokenResponse(user=user). Токен всё ещё нужен для set_access_cookie, но не возвращается в JSON.
