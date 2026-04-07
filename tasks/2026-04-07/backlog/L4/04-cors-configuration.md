### L4-04 — CORS Configuration

**Goal:** Configure CORS middleware for the FastAPI application.
**Input:** L0-02 completed (FastAPI app exists).
**Output:** CORS middleware configured in `backend/app/main.py`.
**Done when:** Frontend can make requests to backend from allowed origins.
**Acceptance criteria:**
- [ ] CORSMiddleware is added to FastAPI app
- [ ] ALLOWED_ORIGINS read from environment (comma-separated list)
- [ ] Allows credentials (cookies, authorization headers)
- [ ] Allows GET, POST, PUT, PATCH, DELETE, OPTIONS methods
- [ ] Allows appropriate headers (Content-Type, Authorization, etc.)
- [ ] Default origins include localhost:5173, localhost:80 for development
**depends_on:** [L0/02]
**impact:** 4
**complexity:** 1
**risk:** 2
**priority_score:** (4 × 2 + 2) / 1 = 10.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Configure CORSMiddleware for FastAPI. Read ALLOWED_ORIGINS from environment (comma-separated). Allow credentials and standard methods/headers. Default to localhost:5173 and localhost:80 for development.
