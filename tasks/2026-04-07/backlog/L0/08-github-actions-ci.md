### L0-08 — GitHub Actions CI Configuration

**Goal:** Create GitHub Actions workflow for CI (lint and test backend, lint and build frontend).
**Input:** L0-02 and L0-03 completed (projects exist).
**Output:** `.github/workflows/ci.yml` with complete CI pipeline.
**Done when:** Push to main or PR triggers CI workflow and runs all jobs.
**Acceptance criteria:**
- [ ] Workflow triggers on push to main and pull_request
- [ ] Backend job: checkout, setup Python 3.12, install dependencies, run lint (ruff), run pytest
- [ ] Frontend job: checkout, setup Node 20, install dependencies, run lint (eslint), run typecheck (tsc --noEmit), run build
- [ ] Jobs can run in parallel (no dependencies between them)
- [ ] Uses caching for pip and npm dependencies
**depends_on:** [L0/02, L0/03]
**impact:** 3
**complexity:** 2
**risk:** 1
**priority_score:** (3 × 2 + 1) / 2 = 3.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create a GitHub Actions workflow file for CI. Backend job uses Python 3.12, runs ruff lint and pytest. Frontend job uses Node 20, runs eslint, tsc typecheck, and npm build. Add caching for dependencies.
