### L0-01 — Миграция python-jose → PyJWT

**Goal:** Заменить неподдерживаемую библиотеку python-jose на PyJWT во всём проекте.
**Input:** Текущий `backend/app/security.py` (использует `from jose import jwt, JWTError`), `backend/pyproject.toml`.
**Output:** Обновлённые `security.py`, `pyproject.toml`. Существующие JWT-токены остаются совместимы.
**Done when:** `ruff check .` чисто, все тесты проходят, импорты `jose` отсутствуют в проекте.
**Acceptance criteria:**
- [ ] `pyproject.toml` содержит `PyJWT` вместо `python-jose[cryptography]`
- [ ] `security.py` использует `import jwt` и `from jwt.exceptions import InvalidTokenError`
- [ ] Все вызовы `jwt.encode()`/`jwt.decode()` работают с HS256
- [ ] `passlib` удалена из зависимостей (не используется)
- [ ] Существующие токены валидны после миграции
**depends_on:** []
**impact:** 5
**complexity:** 2
**risk:** 3
**priority_score:** 6.5
**Est. effort:** S

**LLM Prompt Hint:** Замени python-jose на PyJWT в security.py. API encode/decode идентичен. Замени `from jose import jwt` → `import jwt`, `from jose import JWTError` → `from jwt.exceptions import InvalidTokenError`. Обнови pyproject.toml: убери `python-jose[cryptography]` и `passlib[bcrypt]`, добавь `PyJWT>=2.8.0`. Запусти ruff и pytest.
