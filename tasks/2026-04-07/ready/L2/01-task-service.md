### L2-01 — TaskService Implementation

**Goal:** Implement TaskService with business logic for CRUD operations.
**Input:** L1-01 and L1-03 completed (database and Task model exist).
**Output:** `backend/app/services/task_service.py` with TaskService class.
**Done when:** TaskService has all CRUD methods that work with async sessions.
**Acceptance criteria:**
- [ ] Class TaskService with __init__ accepting db session
- [ ] Method `get_tasks(user_id: UUID, limit: int, offset: int) -> tuple[list[Task], int]` returns tasks and total count
- [ ] Method `get_task(user_id: UUID, task_id: UUID) -> Task | None` returns task if owned by user
- [ ] Method `create_task(user_id: UUID, data: TaskCreate) -> Task` creates and returns new task
- [ ] Method `update_task(user_id: UUID, task_id: UUID, data: TaskUpdate) -> Task | None` updates task if owned
- [ ] Method `toggle_task(user_id: UUID, task_id: UUID) -> Task | None` flips is_completed if owned
- [ ] Method `delete_task(user_id: UUID, task_id: UUID) -> bool` deletes task if owned, returns True if deleted
- [ ] All methods use async/await properly
**depends_on:** [L1/01, L1/03]
**impact:** 5
**complexity:** 3
**risk:** 2
**priority_score:** (5 × 2 + 2) / 3 = 4.0
**Est. effort:** M (2h)
**LLM Prompt Hint:** Create TaskService class with async methods for CRUD operations. Ensure all methods check task ownership (user_id matches). get_tasks should return tuple of (tasks list, total count) with pagination.
