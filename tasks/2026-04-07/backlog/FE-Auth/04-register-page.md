### FE-Auth-04 — Register Page

**Goal:** Create registration page with form validation.
**Input:** L0-03, FE-Auth-01, FE-Auth-02 completed (project, store, and HTTP client exist).
**Output:** `frontend/src/routes/Register.tsx` with registration form.
**Done when:** User can register with valid credentials and is redirected after success.
**Acceptance criteria:**
- [ ] Form with username, email, password, and confirm password fields
- [ ] Uses react-hook-form for form management
- [ ] Uses zod for validation (username min 3 chars, email valid, password min 8 chars, passwords match)
- [ ] Calls authStore.register() on submit
- [ ] Shows loading state while registering
- [ ] Shows error message if registration fails
- [ ] Redirects to /login on successful registration
- [ ] Link to /login page for existing users
- [ ] Styled with Tailwind CSS, responsive design
**depends_on:** [L0/03, FE-Auth/01, FE-Auth/02]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create a registration page with react-hook-form and zod validation. Fields: username, email, password, confirm password. Validate: username min 3, email valid, password min 8, passwords match. Call authStore.register() on submit. Show loading and error states. Redirect to /login on success. Link to /login. Use Tailwind CSS.
