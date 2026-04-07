### FE-PWA-02 — Vite PWA Plugin Configuration

**Goal:** Configure vite-plugin-pwa with Workbox for service worker.
**Input:** L0-03, FE-PWA-01 completed (project and manifest exist).
**Output:** Updated `vite.config.ts` with PWA plugin configuration.
**Done when:** Service worker is generated with precaching and runtime caching.
**Acceptance criteria:**
- [ ] vite-plugin-pwa installed and configured
- [ ] Uses Workbox for service worker
- [ ] Precaches static assets (JS, CSS, HTML)
- [ ] Runtime caching strategy: NetworkFirst for API requests (/api/*)
- [ ] Registers service worker automatically
- [ ] Configured for development (disableServiceWorkerReg in dev) and production
- [ ] manifest referenced from PWA config
**depends_on:** [L0/03, FE-PWA/01]
**impact:** 3
**complexity:** 2
**risk:** 2
**priority_score:** (3 × 2 + 2) / 2 = 4.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Configure vite-plugin-pwa in vite.config.ts. Use Workbox. Precache static assets (JS, CSS, HTML). Use NetworkFirst strategy for /api/* runtime caching. Auto-register service worker. Disable in dev. Reference manifest.
