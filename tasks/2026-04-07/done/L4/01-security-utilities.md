### L4-01 — Password Hashing and JWT Utilities

**Goal:** Implement security utilities for password hashing and JWT token operations.
**Input:** L0-02 completed (backend project exists).
**Output:** `backend/app/security.py` with password hashing and JWT functions.
**Done when:** Password can be hashed and verified, JWT tokens can be created and decoded.
**Acceptance criteria:**
- [ ] `hash_password(password: str) -> str`: hashes password using bcrypt (passlib)
- [ ] `verify_password(plain_password: str, hashed_password: str) -> bool`: verifies password
- [ ] `create_access_token(data: dict, expires_delta: timedelta | None = None) -> str`: creates JWT access token
- [ ] `create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str`: creates JWT refresh token
- [ ] `decode_token(token: str) -> dict | None`: decodes and validates JWT token
- [ ] SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS read from config
- [ ] Uses python-jose for JWT operations
**depends_on:** [L0/02]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create security.py with password hashing (passlib bcrypt) and JWT utilities (python-jose). Implement functions to hash/verify passwords and create/decode access and refresh tokens. Read config from environment.
