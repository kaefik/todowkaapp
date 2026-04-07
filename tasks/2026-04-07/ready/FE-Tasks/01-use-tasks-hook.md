### FE-Tasks-01 — useTasks Hook

**Goal:** Create useTasks hook for task data management (API-based in iteration 1).
**Input:** L0-03, FE-Auth-02 completed (project and HTTP client exist).
**Output:** `frontend/src/hooks/useTasks.ts` with useTasks hook.
**Done when:** Hook provides complete task CRUD operations via API.
**Acceptance criteria:**
- [ ] Returns: tasks (Task[]), isLoading (boolean), error (string | null)
- [ ] Actions: addTask(data), updateTask(id, data), toggleTask(id), deleteTask(id), refetch()
- [ ] All actions use HTTP client with proper error handling
- [ ] refetch() loads all tasks for current user
- [ ] TypeScript types defined for Task, CreateTask, UpdateTask interfaces
- [ ] Automatically refetches on mount if user is authenticated
- [ ] Handles loading and error states appropriately
**depends_on:** [L0/03, FE-Auth/02]
**impact:** 5
**complexity:** 3
**risk:** 2
**priority_score:** (5 × 2 + 2) / 3 = 4.0
**Est. effort:** M (2h)
**LLM Prompt Hint:** Create useTasks hook that manages task data via API. Return tasks array, isLoading, error. Actions: addTask, updateTask, toggleTask, deleteTask, refetch. Use HTTP client for API calls. Define TypeScript types for Task, CreateTask, UpdateTask. Auto-refetch on mount.
