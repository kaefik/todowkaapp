### L3-05 — Task API Endpoints

**Goal:** Implement all task CRUD endpoints.
**Input:** L2-01, L3-02, L4-03 completed (service, schemas, and auth dependency exist).
**Output:** `backend/app/api/tasks.py` with all task endpoints.
**Done when:** All task endpoints are implemented and verify task ownership.
**Acceptance criteria:**
- [ ] `GET /api/tasks`: requires auth, returns paginated task list (limit/offset query params)
- [ ] `POST /api/tasks`: requires auth, creates task for current user, returns 201 with TaskResponse
- [ ] `GET /api/tasks/{id}`: requires auth, returns task if owned by user, 404 if not found, 403 if not owned
- [ ] `PUT /api/tasks/{id}`: requires auth, updates task if owned, returns 200 with TaskResponse
- [ ] `PATCH /api/tasks/{id}/toggle`: requires auth, flips is_completed if owned, returns 200 with TaskResponse
- [ ] `DELETE /api/tasks/{id}`: requires auth, deletes task if owned, returns 204
- [ ] All endpoints use get_current_user dependency
- [ ] All endpoints verify task ownership (user_id matches)
**depends_on:** [L2/01, L3/02, L4/03]
**impact:** 5
**complexity:** 3
**risk:** 2
**priority_score:** (5 × 2 + 2) / 3 = 4.0
**Est. effort:** M (2h)
**LLM Prompt Hint:** Implement task CRUD endpoints: GET (list with pagination), POST (create), GET/{id} (single), PUT/{id} (update), PATCH/{id}/toggle (flip is_completed), DELETE/{id}. All require auth and verify task ownership. Use TaskService for business logic.
