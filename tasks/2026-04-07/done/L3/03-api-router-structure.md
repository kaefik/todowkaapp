### L3-03 — API Router Structure

**Goal:** Create the main API router and include sub-routers for auth and tasks.
**Input:** L0-02 completed (FastAPI app exists).
**Output:** `backend/app/api/router.py` with APIRouter and sub-router includes.
**Done when:** API router is included in the main app and has placeholders for auth and tasks.
**Acceptance criteria:**
- [ ] Creates APIRouter with prefix="/api"
- [ ] Imports and includes auth router (placeholder or from auth.py)
- [ ] Imports and includes tasks router (placeholder or from tasks.py)
- [ ] Router is included in main FastAPI app via `app.include_router(api_router)`
- [ ] Root endpoint returns welcome message or API info
**depends_on:** [L0/02]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create the main API router with prefix="/api". Set up includes for auth and tasks sub-routers (create placeholder files if they don't exist). Include the router in the FastAPI app.
