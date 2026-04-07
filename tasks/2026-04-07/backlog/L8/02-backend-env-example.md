### L8-02 — Backend Environment Variables Example

**Goal:** Create .env.example file for backend with all required variables.
**Input:** L0-02, L1-01, L4-01 completed (backend config, database, and security exist).
**Output:** `backend/.env.example` with all environment variables documented.
**Done when:** All environment variables are listed with descriptions and example values.
**Acceptance criteria:**
- [ ] DATABASE_URL: sqlite+aiosqlite:///./data/todowka.db
- [ ] SECRET_KEY: changeme (generate random 64-char string)
- [ ] ACCESS_TOKEN_EXPIRE_MINUTES: 15
- [ ] REFRESH_TOKEN_EXPIRE_DAYS: 7
- [ ] REGISTRATION_ENABLED: true
- [ ] INVITE_CODE: (optional, commented out)
- [ ] ALLOWED_ORIGINS: http://localhost:5173,http://localhost:80
- [ ] APP_ENV: development
- [ ] LOG_LEVEL: info
- [ ] Each variable has inline comment explaining purpose
**depends_on:** [L0/02, L1/01, L4/01]
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** (4 × 2 + 1) / 1 = 9.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create backend/.env.example with all environment variables. Include: DATABASE_URL, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, REGISTRATION_ENABLED, INVITE_CODE (optional), ALLOWED_ORIGINS, APP_ENV, LOG_LEVEL. Add inline comments explaining each variable.
