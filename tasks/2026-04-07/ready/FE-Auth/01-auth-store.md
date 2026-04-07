### FE-Auth-01 — Auth Zustand Store

**Goal:** Create Zustand store for authentication state management.
**Input:** L0-03 completed (frontend project exists).
**Output:** `frontend/src/stores/authStore.ts` with useAuthStore.
**Done when:** Store can manage user, access token, authentication state, and auth actions.
**Acceptance criteria:**
- [ ] State: user (User | null), accessToken (string | null), isAuthenticated (boolean), isLoading (boolean), error (string | null)
- [ ] Actions: login(credentials) calls API and sets state, register(data) calls API and sets state, logout() clears state, refreshToken() calls refresh endpoint, clearError() clears error
- [ ] Access token is stored in memory only (NOT in localStorage)
- [ ] Computed state: isAuthenticated checks if both user and accessToken exist
- [ ] TypeScript types defined for User interface
**depends_on:** [L0/03]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create a Zustand store for authentication. State: user, accessToken (memory only, not localStorage), isAuthenticated, isLoading, error. Actions: login, register, logout, refreshToken, clearError. Use TypeScript types.
