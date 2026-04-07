### FE-Auth-02 — HTTP Client with Auth Interceptor

**Goal:** Create HTTP client wrapper with automatic token injection and 401 refresh handling.
**Input:** L0-03 completed (frontend project exists).
**Output:** `frontend/src/api/httpClient.ts` with configured fetch/axios client.
**Done when:** HTTP client automatically adds Authorization header and handles 401 with refresh.
**Acceptance criteria:**
- [ ] Creates fetch or axios instance with base URL from VITE_API_BASE_URL
- [ ] Request interceptor adds Authorization header with Bearer token from authStore
- [ ] Response interceptor handles 401 errors: calls refreshToken(), retries original request
- [ ] If refresh fails, redirects to /login
- [ ] Handles network errors gracefully
- [ ] Includes proper TypeScript types for requests/responses
**depends_on:** [L0/03, FE-Auth/01]
**impact:** 5
**complexity:** 3
**risk:** 3
**priority_score:** (5 × 2 + 3) / 3 = 4.3
**Est. effort:** M (2h)
**LLM Prompt Hint:** Create an HTTP client (fetch or axios wrapper) with interceptors. Request interceptor adds Authorization header from authStore. Response interceptor handles 401: call refreshToken(), retry request, redirect to /login if refresh fails.
