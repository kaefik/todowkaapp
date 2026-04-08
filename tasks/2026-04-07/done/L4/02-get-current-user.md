### L4-02 — get_current_user Dependency

**Goal:** Implement FastAPI dependency to extract and validate user from JWT access token.
**Input:** L1-02 and L4-01 completed (User model and security utilities exist).
**Output:** `backend/app/dependencies.py` with get_current_user function.
**Done when:** Dependency can be used in endpoints to get authenticated user.
**Acceptance criteria:**
- [ ] Function `get_current_user(credentials: HTTPBearer = Depends()) -> User`
- [ ] Extracts Authorization header, removes "Bearer " prefix
- [ ] Decodes token using decode_token from security
- [ ] Queries database to get user by user_id from token
- [ ] Returns User if valid, raises HTTPException 401 if invalid
- [ ] Uses get_db dependency for database session
- [ ] Handles expired tokens, invalid tokens, and missing users
**depends_on:** [L1/02, L4/01]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create get_current_user dependency for FastAPI. Extract JWT from Authorization header, decode it, query User from database. Return User if valid, raise 401 if not. Use get_db dependency and security.decode_token.
