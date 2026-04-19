### L0-06 — Backend: Принимать client-provided UUID в TagCreate

**Goal:** Позволить фронтенду передавать свой UUID при создании тега.
**Input:** Текущие `backend/app/schemas/tag.py` (TagCreate), `backend/app/services/tag_service.py`.
**Output:** Обновлённые schema и service.
**Done when:** `POST /api/tags` с `id` возвращает 201 с тем же `id`.
**Acceptance criteria:**
- [ ] `TagCreate` имеет поле `id: str | None = Field(default=None, max_length=36)`
- [ ] `TagService` использует `data.id` если передан
- [ ] POST без `id` работает как раньше
- [ ] Существующие тесты проходят
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
