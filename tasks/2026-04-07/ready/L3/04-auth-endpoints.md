### L3-04 — Auth API Endpoints

**Goal:** Implement all authentication endpoints (register, login, refresh, logout, me).
**Input:** L3-01, L4-01, L4-02, L4-03 completed (schemas and security utilities exist).
**Output:** `backend/app/api/auth.py` with all auth endpoints.
**Done when:** All auth endpoints are implemented and return correct responses.
**Acceptance criteria:**
- [ ] `POST /api/auth/register`: creates user, returns 201 with UserResponse, validates registration enabled
- [ ] `POST /api/auth/login`: verifies credentials, returns access_token in body, sets HttpOnly refresh cookie
- [ ] `POST /api/auth/refresh`: reads refresh cookie, validates, returns new access token and rotates refresh cookie
- [ ] `POST /api/auth/logout`: clears refresh cookie (max_age=0)
- [ ] `GET /api/auth/me`: requires auth, returns current user data
- [ ] All endpoints use proper HTTP status codes and error responses
- [ ] CORS configured to allow credentials
**depends_on:** [L3/01, L4/01, L4/02, L4/03]
**impact:** 5
**complexity:** 3
**risk:** 2
**priority_score:** (5 × 2 + 2) / 3 = 4.0
**Est. effort:** M (2h)
**LLM Prompt Hint:** Implement auth endpoints: register (check REGISTRATION_ENABLED env), login (return access token, set HttpOnly refresh cookie), refresh (rotate refresh token), logout (clear cookie), me (get current user). Use security utilities from L4.
