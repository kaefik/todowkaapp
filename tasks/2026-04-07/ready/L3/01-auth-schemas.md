### L3-01 — Auth Pydantic Schemas

**Goal:** Create Pydantic schemas for authentication requests and responses.
**Input:** L1-02 completed (User model exists).
**Output:** `backend/app/schemas/auth.py` with all auth-related schemas.
**Done when:** All auth schemas are defined and can be used in API endpoints.
**Acceptance criteria:**
- [ ] `RegisterRequest`: username (str, min_length=3, max_length=50), email (EmailStr), password (str, min_length=8)
- [ ] `LoginRequest`: username (str), password (str)
- [ ] `TokenResponse`: access_token (str), token_type (str = "bearer"), user (UserResponse)
- [ ] `UserResponse`: id (UUID), username (str), email (str), is_active (bool), created_at (datetime)
- [ ] All schemas use Pydantic v2 with proper field validators
**depends_on:** [L1/02]
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** (5 × 2 + 1) / 1 = 11.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create Pydantic v2 schemas for authentication: RegisterRequest (username, email, password with validation), LoginRequest (username, password), TokenResponse (access_token, token_type, user), and UserResponse (id, username, email, is_active, created_at).
