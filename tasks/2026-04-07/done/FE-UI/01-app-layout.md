### FE-UI-01 — AppLayout Component

**Goal:** Create main layout component with header.
**Input:** L0-03, FE-Auth-01 completed (project and auth store exist).
**Output:** `frontend/src/components/AppLayout.tsx` component.
**Done when:** Layout displays header with app name, user info, and logout button.
**Acceptance criteria:**
- [ ] Header displays app name "Todowka" (logo)
- [ ] Header displays current username if authenticated
- [ ] Header includes logout button that calls authStore.logout()
- [ ] Mobile responsive: minimal header or burger menu on small screens
- [ ] Renders children (page content) in main area
- [ ] Uses Outlet from react-router for nested routes
- [ ] Styled with Tailwind CSS, clean minimal design
**depends_on:** [L0/03, FE-Auth/01]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** (4 × 2 + 1) / 2 = 4.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create AppLayout component with header. Header shows "Todowka" logo, username (if authenticated), logout button. Use react-router Outlet for children. Make it mobile responsive. Style with Tailwind CSS. Minimal clean design.
