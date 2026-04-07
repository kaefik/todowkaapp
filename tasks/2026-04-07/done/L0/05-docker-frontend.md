### L0-05 — Docker Frontend Dockerfile

**Goal:** Create Dockerfile for the frontend service with nginx.
**Input:** L0-03 completed (frontend project exists).
**Output:** `frontend/Dockerfile` that builds the React app and serves via nginx.
**Done when:** `docker build -t todowka-frontend ./frontend` succeeds and serves the SPA.
**Acceptance criteria:**
- [ ] Uses Node 20 LTS for build stage
- [ ] Runs `npm run build` to create production bundle
- [ ] Uses nginx:alpine for runtime stage
- [ ] Copies build artifacts to nginx html directory
- [ ] Includes or references nginx.conf for SPA routing (try_files)
- [ ] Exposes port 80
**depends_on:** [L0/03]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** (4 × 2 + 1) / 2 = 4.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create a multi-stage Dockerfile for a React Vite app. Build stage uses Node 20 LTS, runtime stage uses nginx:alpine. Configure nginx to serve the SPA with proper fallback routing.
