### L3-07 — Добавить max_length=4096 для init_data (T-06)

**Goal:** Ограничить длину init_data в схеме валидации.
**Input:** `backend/app/schemas/telegram_auth.py:16`.
**Output:** `init_data: str = Field(max_length=4096)`.
**Done when:** Запрос с init_data > 4096 символов отклоняется.
**Acceptance criteria:**
- [ ] `init_data: str` → `init_data: str = Field(max_length=4096)`
- [ ] Pydantic возвращает 422 при превышении лимита
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
