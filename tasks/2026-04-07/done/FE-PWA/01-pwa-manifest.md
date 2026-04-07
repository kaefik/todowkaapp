### FE-PWA-01 — PWA Manifest

**Goal:** Create manifest.json for PWA installation.
**Input:** L0-03 completed (frontend project exists).
**Output:** `frontend/public/manifest.json` with PWA manifest.
**Done when:** Manifest is configured with all required fields.
**Acceptance criteria:**
- [ ] name: "Todowka"
- [ ] short_name: "Todowka"
- [ ] start_url: "/"
- [ ] display: "standalone"
- [ ] theme_color: appropriate color (e.g., #2563eb)
- [ ] background_color: appropriate color (e.g., #ffffff)
- [ ] icons: 192x192 and 512x512 icons (placeholder paths)
- [ ] description: Brief app description
- [ ] orientation: "any" or "portrait"
- [ ] Manifest linked in index.html
**depends_on:** [L0/03]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create manifest.json for PWA. Include: name, short_name, start_url, display, theme_color, background_color, icons (192x192, 512x512), description, orientation. Link in index.html. Use appropriate colors for a todo app.
