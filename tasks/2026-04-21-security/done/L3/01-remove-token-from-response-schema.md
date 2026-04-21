### L3-01 — Убрать access_token из TokenResponse

**Goal:** Удалить поля `access_token` и `token_type` из `TokenResponse` — токен больше не возвращается в JSON, только через httpOnly cookie.

**Input:**
- `backend/app/schemas/user.py` (строки 88–91: `TokenResponse` с `access_token`, `token_type`, `user`)
- `backend/app/schemas/auth.py` (строки 54–57: дублирующий `TokenResponse`)

**Output:** Обновлённые схемы — `TokenResponse` содержит только `user: UserResponse`.

**Done when:** `pytest tests/ -v` проходит (тесты могут падать если ссылаются на `access_token` в ответе — это нормально, исправится в L7-01).

**Acceptance criteria:**
- [ ] В `schemas/user.py`: `TokenResponse` = `user: UserResponse` (без `access_token`, `token_type`)
- [ ] В `schemas/auth.py`: `TokenResponse` = `user: UserResponse` (без `access_token`, `token_type`)
- [ ] Обе схемы идентичны
- [ ] `ruff check backend/app/schemas/` без ошибок

**depends_on:** []

**impact:** 5
**complexity:** 2
**risk:** 3
**priority_score:** 6.5
**Est. effort:** XS

**LLM Prompt Hint:** В schemas/user.py и schemas/auth.py упрости TokenResponse до одного поля: user: UserResponse. Удали access_token и token_type.
