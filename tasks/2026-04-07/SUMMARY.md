# Task Summary — Todowka App (Iteration 1)
Generated: 2026-04-07

## Summary Table (Sorted by Priority Score)

| # | Layer | Task | Score | Effort | Depends on |
|---|-------|------|-------|--------|------------|
| 1 | L0 | L0-01 — Initialize Monorepo Structure | 11.0 | S | — |
| 2 | L1 | L1-02 — User ORM Model | 11.0 | XS | L0/02, L1/01 |
| 3 | L1 | L1-03 — Task ORM Model | 11.0 | XS | L1/01, L1/02 |
| 4 | L3 | L3-01 — Auth Pydantic Schemas | 11.0 | XS | L1/02 |
| 5 | L3 | L3-02 — Task Pydantic Schemas | 11.0 | XS | L1/03 |
| 6 | FE-Auth | FE-Auth-05 — Protected Route Component | 11.0 | XS | L0/03, FE-Auth/01 |
| 7 | L0 | L0-04 — Docker Backend Dockerfile | 9.0 | XS | L0/02 |
| 8 | L4 | L4-03 — Refresh Token Cookie Management | 10.0 | XS | L4/01 |
| 9 | L4 | L4-04 — CORS Configuration | 10.0 | XS | L0/02 |
| 10 | L8 | L8-02 — Backend Environment Variables Example | 9.0 | XS | L0/02, L1/01, L4/01 |
| 11 | L1 | L1-05 — Update User Model with Tasks Relationship | 7.0 | XS | L1/02, L1/03 |
| 12 | L3 | L3-03 — API Router Structure | 7.0 | XS | L0/02 |
| 13 | FE-PWA | FE-PWA-01 — PWA Manifest | 7.0 | XS | L0/03 |
| 14 | L8 | L8-01 — Project README | 7.0 | S | Multiple |
| 15 | L8 | L8-03 — Frontend Environment Variables Example | 7.0 | XS | L0/03, FE-Auth/02 |
| 16 | FE-UI | FE-UI-05 — Collapsible Completed Section | 5.0 | XS | FE-UI/02 |
| 17 | L0 | L0-02 — Backend Project Scaffold | 5.5 | S | L0/01 |
| 18 | L0 | L0-03 — Frontend Project Scaffold | 5.5 | S | L0/01 |
| 19 | L1 | L1-01 — SQLAlchemy Async Engine Configuration | 5.5 | S | L0/02 |
| 20 | L1 | L1-04 — Alembic Initialization and Initial Migration | 6.0 | S | L1/02, L1/03 |
| 21 | L4 | L4-01 — Password Hashing and JWT Utilities | 6.0 | S | L0/02 |
| 22 | L4 | L4-02 — get_current_user Dependency | 6.0 | S | L1/02, L4/01 |
| 23 | FE-Auth | FE-Auth-01 — Auth Zustand Store | 6.0 | S | L0/03 |
| 24 | FE-Auth | FE-Auth-03 — Login Page | 6.0 | S | L0/03, FE-Auth/01, FE-Auth/02 |
| 25 | FE-Auth | FE-Auth-04 — Register Page | 6.0 | S | L0/03, FE-Auth/01, FE-Auth/02 |
| 26 | FE-UI | FE-UI-04 — React Router Configuration | 6.0 | S | Multiple |
| 27 | L0 | L0-05 — Docker Frontend Dockerfile | 4.5 | S | L0/03 |
| 28 | L0 | L0-06 — Docker Compose Configuration | 4.5 | S | L0/04, L0/05 |
| 29 | L0 | L0-07 — Nginx Configuration | 5.0 | S | L0/05 |
| 30 | L0 | L0-08 — GitHub Actions CI Configuration | 3.5 | S | L0/02, L0/03 |
| 31 | L2 | L2-01 — TaskService Implementation | 4.0 | M | L1/01, L1/03 |
| 32 | L3 | L3-04 — Auth API Endpoints | 4.0 | M | Multiple |
| 33 | L3 | L3-05 — Task API Endpoints | 4.0 | M | L2/01, L3/02, L4/03 |
| 34 | FE-Auth | FE-Auth-02 — HTTP Client with Auth Interceptor | 4.3 | M | L0/03, FE-Auth/01 |
| 35 | FE-UI | FE-UI-01 — AppLayout Component | 4.5 | S | L0/03, FE-Auth/01 |
| 36 | FE-UI | FE-UI-02 — Task List Page | 4.0 | M | Multiple |
| 37 | FE-UI | FE-UI-03 — Task Edit Modal | 4.5 | S | L0/03, FE-Tasks/01 |
| 38 | FE-Tasks | FE-Tasks-01 — useTasks Hook | 4.0 | M | L0/03, FE-Auth/02 |
| 39 | FE-PWA | FE-PWA-02 — Vite PWA Plugin Configuration | 4.0 | S | L0/03, FE-PWA/01 |
| 40 | FE-PWA | FE-PWA-03 — Install Prompt Banner | 3.0 | S | L0/03, FE-PWA/02 |
| 41 | L7 | L7-01 — Backend Auth Tests | 3.3 | M | Multiple |
| 42 | L7 | L7-02 — Backend Task Tests | 3.3 | M | Multiple |
| 43 | FE-Tests | FE-Tests-01 — Frontend Task List Tests | 4.0 | S | FE-Tasks/01, FE-UI/02 |
| 44 | FE-Tests | FE-Tests-02 — Frontend Login Form Tests | 4.0 | S | FE-Auth/01, FE-Auth/03 |

## Priority Ranking (Top 10 by Score, Respecting Dependencies)

These are the first 10 tasks to execute, in order:

1. **L0-01 — Initialize Monorepo Structure** (Score: 11.0, Effort: S)
   - No dependencies - start here

2. **L0-02 — Backend Project Scaffold** (Score: 5.5, Effort: S)
   - Depends on: L0/01
   - Sets up FastAPI structure

3. **L0-04 — Docker Backend Dockerfile** (Score: 9.0, Effort: XS)
   - Depends on: L0/02
   - Quick win, high value

4. **L1-01 — SQLAlchemy Async Engine Configuration** (Score: 5.5, Effort: S)
   - Depends on: L0/02
   - Foundation for data layer

5. **L1-02 — User ORM Model** (Score: 11.0, Effort: XS)
   - Depends on: L0/02, L1/01
   - Core data model

6. **L1-03 — Task ORM Model** (Score: 11.0, Effort: XS)
   - Depends on: L1/01, L1/02
   - Core data model

7. **L3-01 — Auth Pydantic Schemas** (Score: 11.0, Effort: XS)
   - Depends on: L1/02
   - Core API contracts

8. **L3-02 — Task Pydantic Schemas** (Score: 11.0, Effort: XS)
   - Depends on: L1/03
   - Core API contracts

9. **L4-01 — Password Hashing and JWT Utilities** (Score: 6.0, Effort: S)
   - Depends on: L0/02
   - Security foundation

10. **L8-02 — Backend Environment Variables Example** (Score: 9.0, Effort: XS)
    - Depends on: L0/02, L1/01, L4/01
    - Documentation that enables other tasks

## Execution Phases

### Phase 1: Foundation (Tasks 1-10 above)
**Estimated: 4-5 hours**
Sets up the project structure, backend, data models, and core security. This unlocks most other tasks.

### Phase 2: Backend API
**Estimated: 4-5 hours**
- L1-04: Alembic migration
- L1-05: User-Tasks relationship
- L2-01: TaskService
- L3-03: API router
- L3-04: Auth endpoints
- L3-05: Task endpoints
- L4-02: get_current_user
- L4-03: Refresh cookie management
- L4-04: CORS configuration

### Phase 3: Frontend Auth & API
**Estimated: 4-5 hours**
- L0-03: Frontend scaffold
- FE-Auth-01: Auth store
- FE-Auth-02: HTTP client
- FE-Auth-03: Login page
- FE-Auth-04: Register page
- FE-Auth-05: Protected route

### Phase 4: Frontend UI & Tasks
**Estimated: 3-4 hours**
- FE-Tasks-01: useTasks hook
- FE-UI-01: AppLayout
- FE-UI-02: Task list page
- FE-UI-03: Task edit modal
- FE-UI-04: Router config
- FE-UI-05: Collapsible completed

### Phase 5: PWA
**Estimated: 1-2 hours**
- FE-PWA-01: Manifest
- FE-PWA-02: PWA plugin config
- FE-PWA-03: Install prompt

### Phase 6: Docker & Infrastructure
**Estimated: 1-2 hours**
- L0-05: Frontend Dockerfile
- L0-06: Docker Compose
- L0-07: Nginx config
- L0-08: GitHub Actions CI

### Phase 7: Testing
**Estimated: 3-4 hours**
- L7-01: Backend auth tests
- L7-02: Backend task tests
- FE-Tests-01: Frontend task tests
- FE-Tests-02: Frontend login tests

### Phase 8: Documentation
**Estimated: 1 hour**
- L8-01: README
- L8-03: Frontend .env.example

**Total Estimated: 21-28 hours**

## LLM Execution Guide

### System Prompt (Set Once)
```
You are implementing the Todowka app following a detailed task plan. Each task is self-contained and has clear acceptance criteria.

Context:
- Full-stack monorepo: FastAPI backend, React frontend
- SQLite database with SQLAlchemy async
- JWT auth with access tokens (memory) and refresh tokens (HttpOnly cookies)
- PWA with vite-plugin-pwa
- Docker deployment with nginx

Rules:
1. Always return complete files, never diffs
2. Include all imports
3. No TODO comments or placeholders
4. Follow code conventions from 00-guide.md
5. Verify all acceptance criteria before completing task
6. If you encounter missing dependencies, note them but proceed with what's possible
```

### Prompt Pattern for Each Task
```
Task: [LAYER]-[NUMBER] — [Task Title]

Goal: [Copy from task card]

Input: [Copy from task card - what should already exist]

Output: [Copy from task card - what to create]

Acceptance Criteria:
[Copy all criteria from task card]

Please implement this task by creating the specified file(s) with all required functionality.
```

### Context Passing Between Tasks
When executing tasks sequentially, pass:
1. The completed task's output (file paths, created artifacts)
2. Any configuration values that might be needed
3. Notes on any deviations from the original plan

### Verification After Each Task
Run appropriate verification commands:
- For code: lint and typecheck
- For tests: run the test suite
- For Docker: build and verify container starts
- For endpoints: test with curl or API client

### Handling Blockers
If a task cannot be completed due to missing dependencies:
1. Document what's missing
2. Create placeholder/stub implementation if possible
3. Mark task as blocked in _progress.json
4. Move to next task that doesn't depend on the blocker

## Quality Checklist

Before marking the plan complete:
- [x] No task requires knowledge from a future step
- [x] Every entity in the design document has at least one task (User, Task)
- [x] Every user-facing feature has at least one corresponding test task
- [x] Auth/security is in Layer 4, not afterthought
- [x] Layer 9 (Observability) skipped for MVP (documented in 00-guide.md)
- [x] Each task has a measurable done condition and acceptance criteria
- [x] Total plan can be executed top-to-bottom without circular dependencies
- [x] priority_score is computed for every task
- [x] All tasks sized appropriately (XS/S/M, no L tasks)

## Statistics

- Total Tasks: 44
- Layers: 8 (L0, L1, L2, L3, L4, L7, L8, FE-*)
- Effort Distribution:
  - XS: 17 tasks (~39%)
  - S: 16 tasks (~36%)
  - M: 11 tasks (~25%)
  - L: 0 tasks
- High Impact Tasks (impact 5): 19 tasks
- High Risk Tasks (risk 3+): 1 task
- Total Estimated Effort: 21-28 hours
