### L0-03 — Backend: Принимать client-provided UUID в ProjectCreate

**Goal:** Позволить фронтенду передавать свой UUID при создании проекта.
**Input:** Текущие `backend/app/schemas/project.py` (ProjectCreate), `backend/app/services/project_service.py`.
**Output:** Обновлённые schema и service.
**Done when:** `POST /api/projects` с `id` возвращает 201 с тем же `id`.
**Acceptance criteria:**
- [ ] `ProjectCreate` имеет поле `id: str | None = Field(default=None, max_length=36)`
- [ ] `ProjectService` использует `data.id` если передан
- [ ] POST без `id` работает как раньше
- [ ] Существующие тесты проходят
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
**LLM Prompt Hint:** "Same pattern as L0-02 but for Project. Add id field to ProjectCreate schema and use it in project_service.py create method."
