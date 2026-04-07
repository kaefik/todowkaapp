### L0-04 — Docker Backend Dockerfile

**Goal:** Create Dockerfile for the backend service.
**Input:** L0-02 completed (backend project exists).
**Output:** `backend/Dockerfile` that builds a production-ready FastAPI image.
**Done when:** `docker build -t todowka-backend ./backend` succeeds.
**Acceptance criteria:**
- [ ] Uses Python 3.12 slim image
- [ ] Installs dependencies from pyproject.toml or requirements.txt
- [ ] Copies application code to /app
- [ ] Sets CMD to run uvicorn with appropriate host and port (0.0.0.0:8000)
- [ ] Exposes port 8000
**depends_on:** [L0/02]
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** (4 × 2 + 1) / 1 = 9.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create a production-ready Dockerfile for a FastAPI application using Python 3.12. Use multi-stage build if appropriate. Set uvicorn to run on host 0.0.0.0 port 8000.
