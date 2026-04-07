### FE-PWA-03 — Install Prompt Banner

**Goal:** Add install prompt banner/button using beforeinstallprompt event.
**Input:** L0-03, FE-PWA-02 completed (project and PWA configured).
**Output:** Install banner component integrated in app.
**Done when:** Users see install prompt when eligible and can install the app.
**Acceptance criteria:**
- [ ] Listens for beforeinstallprompt event
- [ ] Stores event and shows install banner when event fires
- [ ] Install banner shows "Install app" button
- [ ] Clicking install button calls prompt() on the event
- [ ] Hides banner after successful install or user dismissal
- [ ] Checks if app is already installed (window.matchMedia('(display-mode: standalone)'))
- [ ] Styled with Tailwind CSS, unobtrusive placement (bottom or top)
**depends_on:** [L0/03, FE-PWA/02]
**impact:** 2
**complexity:** 2
**risk:** 2
**priority_score:** (2 × 2 + 2) / 2 = 3.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Add install prompt banner using beforeinstallprompt event. Show banner when event fires. Button calls prompt(). Hide after install or dismissal. Check if already installed. Tailwind CSS, unobtrusive placement.
