### L0-02 — Backend: Принимать client-provided UUID в TaskCreate

**Goal:** Позволить фронтенду передавать свой UUID при создании задачи для работы офлайн.
**Input:** Текущие `backend/app/schemas/task.py` (TaskCreate), `backend/app/services/task_service.py` (create_task).
**Output:** Обновлённые schema и service, принимающие опциональное поле `id`.
**Done when:** `POST /api/tasks` с body `{"title": "test", "id": "550e8400-e29b-41d4-a716-446655440000"}` возвращает 201 с тем же `id`.
**Acceptance criteria:**
- [ ] `TaskCreate` имеет поле `id: str | None = None` с `max_length=36`
- [ ] `TaskService.create_task` использует `data.id` если передан, иначе генерирует `uuid4()`
- [ ] POST без `id` работает как раньше (бекенд генерирует UUID)
- [ ] POST с `id` возвращает задачу с переданным `id`
- [ ] Существующие тесты проходят
**depends_on:** []
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** 11.0
**Est. effort:** S
**LLM Prompt Hint:** "In backend/app/schemas/task.py, add `id: str | None = Field(default=None, max_length=36)` to TaskCreate. In backend/app/services/task_service.py create_task method, use `data.id` as the task id if provided, otherwise generate uuid4()."
