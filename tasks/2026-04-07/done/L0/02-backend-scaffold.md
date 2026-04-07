### L0-02 — Backend Project Scaffold

**Goal:** Initialize the backend Python project with FastAPI structure.
**Input:** L0-01 completed (monorepo structure exists).
**Output:** Complete backend package structure with pyproject.toml, main.py, config.py, and all subdirectories.
**Done when:** `backend/app/` has full structure and project can be imported.
**Acceptance criteria:**
- [ ] pyproject.toml or requirements.txt exists with FastAPI, uvicorn, sqlalchemy, aiosqlite, alembic, pydantic-settings, python-jose, passlib, python-multipart
- [ ] Directory structure: app/{main.py, config.py, database.py, models/, schemas/, api/router.py, services/, dependencies.py, security.py}, alembic/, tests/
- [ ] main.py creates FastAPI app factory function `create_app()`
- [ ] config.py uses Pydantic Settings with environment variable loading
**depends_on:** [L0/01]
**impact:** 5
**complexity:** 2
**risk:** 1
**priority_score:** (5 × 2 + 1) / 2 = 5.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create a FastAPI project structure with a factory pattern. Include all necessary directories and a config.py using Pydantic Settings. Set up pyproject.toml with FastAPI and all dependencies from the design document.
