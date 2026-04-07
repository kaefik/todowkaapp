### L0-06 — Docker Compose Configuration

**Goal:** Create docker-compose.yml to orchestrate backend and frontend services.
**Input:** L0-04 and L0-05 completed (Dockerfiles exist).
**Output:** `docker/docker-compose.yml` with both services and volume for SQLite.
**Done when:** `docker-compose up` starts both services successfully.
**Acceptance criteria:**
- [ ] Defines `backend` service using backend/Dockerfile, port 8000
- [ ] Defines `frontend` service using frontend/Dockerfile, port 80
- [ ] Creates named volume for SQLite database persistence
- [ ] Backend service mounts volume to appropriate data directory
- [ ] Frontend service can reach backend via service name
- [ ] Environment variables are passed to services where needed
**depends_on:** [L0/04, L0/05]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** (4 × 2 + 1) / 2 = 4.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create docker-compose.yml with backend (port 8000) and frontend (port 80) services. Add a named volume for SQLite database persistence. Ensure services can communicate.
