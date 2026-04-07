### L1-04 — Alembic Initialization and Initial Migration

**Goal:** Initialize Alembic and create initial migration for User and Task models.
**Input:** L1-02 and L1-03 completed (User and Task models exist).
**Output:** Alembic configured with initial migration `001_initial_schema`.
**Done when:** `alembic upgrade head` creates both tables in the database.
**Acceptance criteria:**
- [ ] Alembic initialized with `alembic init alembic`
- [ ] alembic/env.py imports Base and models from app.models
- [ ] alembic.ini configured with correct database URL
- [ ] Initial migration generated with `alembic revision --autogenerate -m "initial schema"`
- [ ] Migration script creates users and tasks tables with all columns, indexes, and foreign keys
- [ ] Running `alembic upgrade head` applies the migration successfully
**depends_on:** [L1/02, L1/03]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Initialize Alembic for the FastAPI project. Configure alembic/env.py to import models. Generate initial migration with --autogenerate. Ensure migration creates users and tasks tables with all indexes and foreign keys.
