### FE-UI-04 — React Router Configuration

**Goal:** Configure React Router with all routes.
**Input:** L0-03, FE-Auth-03, FE-Auth-04, FE-Auth-05, FE-UI-01, FE-UI-02 completed (all route components exist).
**Output:** `frontend/src/main.tsx` or `frontend/src/App.tsx` with router configuration.
**Done when:** All routes are configured and navigation works correctly.
**Acceptance criteria:**
- [ ] Configured with react-router-dom v7 (createBrowserRouter, RouterProvider)
- [ ] Routes: / → Tasks (or /tasks), /login → Login, /register → Register
- [ ] Tasks route wrapped in ProtectedRoute
- [ ] AppLayout wraps all authenticated routes
- [ ] 404 route for unmatched paths (redirect to / or /login)
- [ ] Auto-redirect: if not authenticated and on protected route, go to /login
- [ ] TypeScript typed routes
**depends_on:** [L0/03, FE-Auth/03, FE-Auth/04, FE-Auth/05, FE-UI/01, FE-UI/02]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Configure React Router v7 with createBrowserRouter. Routes: / → Tasks, /login → Login, /register → Register. Wrap Tasks in ProtectedRoute and AppLayout. Add 404 redirect. Ensure auto-redirect for unauthenticated users. TypeScript typed.
