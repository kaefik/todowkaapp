### L4-03 — Refresh Token Cookie Management

**Goal:** Implement helper functions to manage refresh token cookies.
**Input:** L4-01 completed (JWT utilities exist).
**Output:** Helper functions in `backend/app/security.py` or `backend/app/api/auth.py` for cookie management.
**Done when:** Refresh cookies can be set and cleared with proper security attributes.
**Acceptance criteria:**
- [ ] Function `set_refresh_cookie(response: Response, token: str) -> None`: sets HttpOnly, Secure, SameSite=Strict cookie
- [ ] Function `clear_refresh_cookie(response: Response) -> None`: sets cookie with max_age=0 to clear it
- [ ] Cookie name is "refresh_token"
- [ ] Cookie path is "/api/auth"
- [ ] HttpOnly, Secure, SameSite=Strict attributes are set
- [ ] Cookie expiration matches REFRESH_TOKEN_EXPIRE_DAYS
**depends_on:** [L4/01]
**impact:** 4
**complexity:** 1
**risk:** 2
**priority_score:** (4 × 2 + 2) / 1 = 10.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create helper functions to set and clear refresh token cookies. Set cookie with HttpOnly, Secure, SameSite=Strict attributes. Cookie name is "refresh_token", path is "/api/auth". Clear by setting max_age=0.
