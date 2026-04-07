### FE-Auth-05 — Protected Route Component

**Goal:** Create ProtectedRoute wrapper to protect authenticated routes.
**Input:** L0-03, FE-Auth-01 completed (project and auth store exist).
**Output:** `frontend/src/components/ProtectedRoute.tsx` component.
**Done when:** Unauthenticated users are redirected to /login when accessing protected routes.
**Acceptance criteria:**
- [ ] Accepts children prop
- [ ] Checks authStore.isAuthenticated
- [ ] If not authenticated and not loading, redirects to /login using react-router
- [ ] If loading, shows loading spinner or skeleton
- [ ] If authenticated, renders children
- [ ] TypeScript typed properly
**depends_on:** [L0/03, FE-Auth/01]
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** (5 × 2 + 1) / 1 = 11.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create a ProtectedRoute component that wraps children. Check authStore.isAuthenticated. If not authenticated and not loading, redirect to /login. If loading, show spinner. If authenticated, render children. Use react-router for navigation.
