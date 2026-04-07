### FE-UI-02 — Task List Page

**Goal:** Create main tasks page with list and add form.
**Input:** L0-03, FE-Tasks-01, FE-UI-01 completed (hook and layout exist).
**Output:** `frontend/src/routes/Tasks.tsx` with task list and add form.
**Done when:** User can view, add, toggle, edit, and delete tasks.
**Acceptance criteria:**
- [ ] Uses useTasks hook to fetch and manage tasks
- [ ] Quick add form at top: title input + add button (submit on Enter)
- [ ] Optional expandable description field in add form
- [ ] Task list shows all tasks, separated into "Active" and "Completed" sections
- [ ] Each task: checkbox (toggle) + title + description (if exists) + edit button + delete button
- [ ] Completed tasks show strikethrough text
- [ ] Empty state: "No tasks. Add your first task!"
- [ ] Loading state: skeleton loaders or spinner
- [ ] Error state: error message + retry button
- [ ] Styled with Tailwind CSS, responsive (320px+)
- [ ] Wrapped in ProtectedRoute
**depends_on:** [L0/03, FE-Tasks/01, FE-UI/01, FE-Auth/05]
**impact:** 5
**complexity:** 3
**risk:** 2
**priority_score:** (5 × 2 + 2) / 3 = 4.0
**Est. effort:** M (2h)
**LLM Prompt Hint:** Create Tasks page with useTasks hook. Add form: title input + button, optional description. List tasks separated into Active/Completed sections. Each task: checkbox, title, edit button, delete button. Completed tasks strikethrough. Empty state, loading skeleton, error with retry. ProtectedRoute. Tailwind CSS, responsive.
