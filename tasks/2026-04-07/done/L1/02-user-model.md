### L1-02 — User ORM Model

**Goal:** Create the User SQLAlchemy model.
**Input:** L1-01 completed (database configuration exists).
**Output:** `backend/app/models/user.py` with User model definition.
**Done when:** User model can be imported and has all required fields and relationships.
**Acceptance criteria:**
- [ ] Inherits from DeclarativeBase
- [ ] Fields: id (UUID, primary_key), username (VARCHAR(50), unique, indexed), email (VARCHAR(255), unique, indexed), password_hash (VARCHAR(255), not null), is_active (BOOLEAN, default=True), created_at (TIMESTAMP, default=now()), updated_at (TIMESTAMP, default=now(), onupdate=now())
- [ ] Uses uuid.uuid4 for id generation
- [ ] Includes __repr__ method for debugging
- [ ] Indexes are defined on username and email columns
**depends_on:** [L1/01]
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** (5 × 2 + 1) / 1 = 11.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Create a SQLAlchemy User model with UUID primary key, username (unique, indexed), email (unique, indexed), password_hash, is_active, and timestamps. Use uuid.uuid4 for id generation.
