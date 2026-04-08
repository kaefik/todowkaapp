### L7-01 — Backend Auth Tests

**Goal:** Write backend tests for authentication endpoints.
**Input:** L3-04, L4-01, L4-02, L4-03 completed (auth endpoints and security exist).
**Output:** Backend test file `backend/tests/test_auth.py` with auth tests.
**Done when:** All auth tests pass with pytest.
**Acceptance criteria:**
- [ ] Test registration success (valid data)
- [ ] Test registration duplicate username/email (409)
- [ ] Test registration when disabled (403 if REGISTRATION_ENABLED=false)
- [ ] Test login success (valid credentials)
- [ ] Test login invalid password (401)
- [ ] Test login non-existent user (401)
- [ ] Test refresh token success (valid token)
- [ ] Test refresh token invalid (401)
- [ ] Test logout success (cookie cleared)
- [ ] Test /me endpoint with valid token
- [ ] Test /me endpoint without token (401)
- [ ] Uses pytest with httpx AsyncClient
**depends_on:** [L3/04, L4/01, L4/02, L4/03]
**impact:** 4
**complexity:** 3
**risk:** 2
**priority_score:** (4 × 2 + 2) / 3 = 3.3
**Est. effort:** M (2h)
**LLM Prompt Hint:** Write pytest tests for auth endpoints using httpx AsyncClient. Test: register (success, duplicate, disabled), login (success, invalid credentials), refresh (success, invalid), logout, /me (with/without token). Use test database.
