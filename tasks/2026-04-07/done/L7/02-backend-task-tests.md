### L7-02 — Backend Task Tests

**Goal:** Write backend tests for task CRUD endpoints.
**Input:** L2-01, L3-05, L4-02 completed (service, endpoints, and auth dependency exist).
**Output:** Backend test file `backend/tests/test_tasks.py` with task tests.
**Done when:** All task tests pass with pytest.
**Acceptance criteria:**
- [ ] Test create task success
- [ ] Test get tasks list with pagination (limit, offset)
- [ ] Test get single task (owner)
- [ ] Test get single task not found (404)
- [ ] Test get single task not owner (403)
- [ ] Test update task success
- [ ] Test toggle task success (flips is_completed)
- [ ] Test delete task success
- [ ] Test all endpoints without auth (401)
- [ ] Test all endpoints with different user (403)
- [ ] Uses pytest with httpx AsyncClient
**depends_on:** [L2/01, L3/05, L4/02]
**impact:** 4
**complexity:** 3
**risk:** 2
**priority_score:** (4 × 2 + 2) / 3 = 3.3
**Est. effort:** M (2h)
**LLM Prompt Hint:** Write pytest tests for task CRUD endpoints using httpx AsyncClient. Test: create, list (pagination), get (owner, not found, not owner), update, toggle, delete. Test all without auth (401) and with wrong user (403). Use test database.
