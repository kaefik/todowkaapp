### L6-01 — Валидация secret_key в production

**Goal:** Запретить запуск с дефолтным secret_key в production, предупредить в development.

**Input:** `backend/app/config.py` (строка 10: `secret_key: str = "changeme-generate-random-string-64-chars"`)

**Output:** Обновлённый `backend/app/config.py` с `@field_validator("secret_key")`.

**Done when:** `pytest tests/test_auth.py -v` проходит. При `APP_ENV=production` и дефолтном ключе — startup падает с `ValueError`.

**Acceptance criteria:**
- [ ] Добавлен `@field_validator("secret_key")` в класс `Settings`
- [ ] При `secret_key == "changeme-generate-random-string-64-chars"` и `app_env == "production"` — raise `ValueError`
- [ ] При дефолтном ключе в development — `warnings.warn`
- [ ] Существующие тесты проходят

**depends_on:** []

**impact:** 4
**complexity:** 1
**risk:** 2
**priority_score:** 10.0
**Est. effort:** XS

**LLM Prompt Hint:** Добавь field_validator для secret_key в Pydantic Settings класс. Если ключ дефолтный и app_env=production — raise ValueError. Если development — warnings.warn.
