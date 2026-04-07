### L8-03 — Frontend Environment Variables Example

**Goal:** Create .env.example file for frontend with all required variables.
**Input:** L0-03, FE-Auth-02 completed (frontend project and HTTP client exist).
**Output:** `frontend/.env.example` with all environment variables documented.
**Done when:** All environment variables are listed with descriptions and example values.
**Acceptance criteria:**
- [ ] VITE_API_BASE_URL: /api
- [ ] VITE_APP_NAME: Todowka
- [ ] Each variable has inline comment explaining purpose
- [ ] Note that VITE_ prefix is required for variables to be available in frontend
**depends_on:** [L0/03, FE-Auth/02]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create frontend/.env.example with all environment variables. Include: VITE_API_BASE_URL, VITE_APP_NAME. Add inline comments explaining each variable. Note that VITE_ prefix is required.
