### L1-03 — Task ORM Model

**Goal:** Create the Task SQLAlchemy model with foreign key to User.
**Input:** L1-01 and L1-02 completed (database and User model exist).
**Output:** `backend/app/models/task.py` with Task model definition and relationship to User.
**Done when:** Task model can be imported and has foreign key relationship to User.
**Acceptance criteria:**
- [ ] Inherits from DeclarativeBase
- [ ] Fields: id (UUID, primary_key), user_id (UUID, ForeignKey('users.id'), indexed), title (VARCHAR(255), not null), description (TEXT, nullable), is_completed (BOOLEAN, default=False), created_at (TIMESTAMP, default=now()), updated_at (TIMESTAMP, default=now(), onupdate=now())
- [ ] Defines relationship to User model (back_populates='tasks')
- [ ] User model has tasks relationship (back_populates='user')
- [ ] Indexes on user_id and (user_id, is_completed) for filtering
**depends_on:** [L1/01, L1/02]
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** (5 × 2 + 1) / 1 = 11.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create a SQLAlchemy Task model with UUID primary key, user_id foreign key to users, title, description (nullable), is_completed, and timestamps. Add relationship to User and composite index on (user_id, is_completed).
