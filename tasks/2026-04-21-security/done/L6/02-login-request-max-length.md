### L6-02 — Добавить max_length в LoginRequest

**Goal:** Ограничить длину username и password в схеме LoginRequest для защиты от отправки гигантских строк.

**Input:** `backend/app/schemas/user.py` (строки 83–85: `LoginRequest` с `username: str`, `password: str`)

**Output:** Обновлённый `backend/app/schemas/user.py` с `Field(min_length=1, max_length=...)`.

**Done when:** `pytest tests/ -v` проходит. POST `/api/auth/login` с username > 255 символов возвращает 422.

**Acceptance criteria:**
- [ ] `username: str = Field(min_length=1, max_length=255)`
- [ ] `password: str = Field(min_length=1, max_length=128)`
- [ ] Добавлен импорт `Field` из pydantic (если нет)
- [ ] Существующие тесты проходят

**depends_on:** []

**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS

**LLM Prompt Hint:** В schemas/user.py добавь Field с min_length=1 и max_length для username (255) и password (128) в LoginRequest.
