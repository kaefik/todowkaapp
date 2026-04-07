### L3-02 — Task Pydantic Schemas

**Goal:** Create Pydantic schemas for task requests and responses.
**Input:** L1-03 completed (Task model exists).
**Output:** `backend/app/schemas/task.py` with all task-related schemas.
**Done when:** All task schemas are defined and can be used in API endpoints.
**Acceptance criteria:**
- [ ] `TaskCreate`: title (str, min_length=1, max_length=255), description (str | None = None)
- [ ] `TaskUpdate`: title (str | None = None), description (str | None = None), is_completed (bool | None = None)
- [ ] `TaskResponse`: id (UUID), user_id (UUID), title (str), description (str | None), is_completed (bool), created_at (datetime), updated_at (datetime)
- [ ] `TaskListResponse`: items (list[TaskResponse]), total (int)
- [ ] All schemas use Pydantic v2 with proper field validators
**depends_on:** [L1/03]
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** (5 × 2 + 1) / 1 = 11.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create Pydantic v2 schemas for tasks: TaskCreate (title, optional description), TaskUpdate (all optional fields), TaskResponse (all model fields), and TaskListResponse (items list, total count).
