### L1-01 — SQLAlchemy Async Engine Configuration

**Goal:** Configure SQLAlchemy async engine with aiosqlite and WAL mode.
**Input:** L0-02 completed (backend project exists).
**Output:** `backend/app/database.py` with async engine, session factory, and get_db dependency.
**Done when:** Engine is configured with aiosqlite and WAL mode is enabled on connection.
**Acceptance criteria:**
- [ ] Creates async engine using create_async_engine with aiosqlite
- [ ] Enables WAL mode in connect_args (check_same_thread=False for SQLite)
- [ ] Creates async session factory with AsyncSession
- [ ] Provides get_db dependency function for FastAPI (generator that yields session)
- [ ] DATABASE_URL is read from config/env
**depends_on:** [L0/02]
**impact:** 5
**complexity:** 2
**risk:** 1
**priority_score:** (5 × 2 + 1) / 2 = 5.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create database.py for SQLAlchemy 2.0 async setup. Use aiosqlite dialect with WAL mode enabled. Create get_db dependency for FastAPI. Read DATABASE_URL from environment.
