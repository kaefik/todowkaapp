### L0-04 — Backend: Принимать client-provided UUID в AreaCreate

**Goal:** Позволить фронтенду передавать свой UUID при создании области.
**Input:** Текущие `backend/app/schemas/area.py` (AreaCreate), `backend/app/services/area_service.py`.
**Output:** Обновлённые schema и service.
**Done when:** `POST /api/areas` с `id` возвращает 201 с тем же `id`.
**Acceptance criteria:**
- [ ] `AreaCreate` имеет поле `id: str | None = Field(default=None, max_length=36)`
- [ ] `AreaService` использует `data.id` если передан
- [ ] POST без `id` работает как раньше
- [ ] Существующие тесты проходят
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
