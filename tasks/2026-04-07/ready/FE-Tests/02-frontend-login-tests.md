### FE-Tests-02 — Frontend Login Form Tests

**Goal:** Write frontend tests for login form validation and submission.
**Input:** FE-Auth-01, FE-Auth-03 completed (store and page exist).
**Output:** Frontend test file `frontend/src/Login.test.tsx` with login tests.
**Done when:** All login form tests pass with vitest.
**Acceptance criteria:**
- [ ] Test renders login form
- [ ] Test shows validation errors for empty fields
- [ ] Test shows loading state on submit
- [ ] Test shows error message on failed login
- [ ] Test calls authStore.login with correct credentials
- [ ] Test redirects to /tasks on successful login
- [ ] Test link to /register page exists
- [ ] Uses Vitest + React Testing Library
- [ ] Mocks authStore
**depends_on:** [FE-Auth/01, FE-Auth/03]
**impact:** 3
**complexity:** 2
**risk:** 2
**priority_score:** (3 × 2 + 2) / 2 = 4.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Write Vitest + RTL tests for Login page. Test: renders form, validation errors, loading state, error message, calls authStore.login, redirects on success, link to register. Mock authStore.
