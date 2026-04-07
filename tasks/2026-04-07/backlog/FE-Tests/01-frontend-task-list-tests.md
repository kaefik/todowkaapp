### FE-Tests-01 — Frontend Task List Tests

**Goal:** Write frontend tests for task list functionality.
**Input:** FE-Tasks-01, FE-UI-02 completed (hook and page exist).
**Output:** Frontend test file `frontend/src/Tasks.test.tsx` with task list tests.
**Done when:** All task list tests pass with vitest.
**Acceptance criteria:**
- [ ] Test renders task list
- [ ] Test shows empty state when no tasks
- [ ] Test shows loading state
- [ ] Test shows error state with retry button
- [ ] Test adds task via form
- [ ] Test toggles task completion
- [ ] Test deletes task
- [ ] Test separates active and completed tasks
- [ ] Uses Vitest + React Testing Library
- [ ] Mocks useTasks hook
**depends_on:** [FE-Tasks/01, FE-UI/02]
**impact:** 3
**complexity:** 2
**risk:** 2
**priority_score:** (3 × 2 + 2) / 2 = 4.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Write Vitest + RTL tests for Tasks page. Test: renders list, empty state, loading state, error state with retry, add task, toggle task, delete task, active/completed separation. Mock useTasks hook.
