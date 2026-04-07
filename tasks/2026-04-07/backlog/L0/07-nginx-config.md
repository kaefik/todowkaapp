### L0-07 — Nginx Configuration

**Goal:** Create nginx.conf to proxy API requests to backend and serve frontend SPA.
**Input:** L0-05 completed (frontend Dockerfile references nginx.conf).
**Output:** `docker/nginx.conf` with proper routing configuration.
**Done when:** Nginx correctly proxies /api/* to backend and serves frontend for all other routes.
**Acceptance criteria:**
- [ ] Listens on port 80
- [ ] Location block `/api/` proxies to backend:8000 with appropriate headers (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)
- [ ] Location block `/` serves frontend static files from /usr/share/nginx/html
- [ ] try_files directive enables SPA routing (try_files $uri $uri/ /index.html)
- [ ] Includes gzip compression for text-based content types
**depends_on:** [L0/05]
**impact:** 4
**complexity:** 2
**risk:** 2
**priority_score:** (4 × 2 + 2) / 2 = 5.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create nginx.conf for a React SPA with backend API. Proxy /api/* to backend:8000. Serve frontend static files with SPA fallback using try_files. Add gzip compression.
