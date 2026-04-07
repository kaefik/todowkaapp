### FE-Auth-03 — Login Page

**Goal:** Create login page with form validation.
**Input:** L0-03, FE-Auth-01, FE-Auth-02 completed (project, store, and HTTP client exist).
**Output:** `frontend/src/routes/Login.tsx` with login form.
**Done when:** User can log in with valid credentials and is redirected after success.
**Acceptance criteria:**
- [ ] Form with username and password fields
- [ ] Uses react-hook-form for form management
- [ ] Uses zod for validation (username required, password required)
- [ ] Calls authStore.login() on submit
- [ ] Shows loading state while logging in
- [ ] Shows error message if login fails
- [ ] Redirects to /tasks on successful login
- [ ] Link to /register page for new users
- [ ] Styled with Tailwind CSS, responsive design
**depends_on:** [L0/03, FE-Auth/01, FE-Auth/02]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create a login page with react-hook-form and zod validation. Fields: username, password. Call authStore.login() on submit. Show loading and error states. Redirect to /tasks on success. Link to /register. Use Tailwind CSS.
