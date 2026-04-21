### L6-04 — Усилить валидацию cookie_secure

**Goal:** Предупредить разработчика если cookie_secure=False в non-development окружении.

**Input:** `backend/app/config.py` (строки 31–37: `set_cookie_secure_for_production`)

**Output:** Обновлённый `backend/app/config.py` с `warnings.warn` при небезопасной конфигурации.

**Done when:** При `cookie_secure=False` и `app_env != "development"` выводится warning.

**Acceptance criteria:**
- [ ] В `set_cookie_secure_for_production` добавлен `warnings.warn` если после валидации `cookie_secure=False` и `app_env != "development"`
- [ ] Добавлен `import warnings` (если нет)
- [ ] Существующие тесты проходят

**depends_on:** []

**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS

**LLM Prompt Hint:** В config.py добавь warnings.warn в set_cookie_secure_for_production если cookie_secure=False и app_env != "development".
