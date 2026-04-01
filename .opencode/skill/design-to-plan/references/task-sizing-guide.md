# Task Sizing Guide

## Effort Tiers

| Size | Time       | Fits in 1 LLM prompt? | Example |
|------|------------|----------------------|---------|
| XS   | ~30 min    | ✅ Yes               | Add a field to existing model; write one unit test; add an env variable |
| S    | ~1 hour    | ✅ Yes               | Create one DB migration; scaffold one CRUD endpoint; write validation for one DTO |
| M    | ~2 hours   | ⚠️ Usually, if focused | Full CRUD for one resource (5 endpoints); auth middleware; JWT setup |
| L    | ~4 hours   | ❌ Split it           | Full feature end-to-end; OAuth integration; real-time event system |

## When to Split

**Split M → multiple S when:**
- The task touches more than 2 files
- There's a design decision embedded in the task
- The task has a non-trivial algorithm component

**Never merge tasks that:**
- Are in different layers
- Have different owners (frontend vs backend)
- Have different risk profiles (risky + safe = risky)

## Examples of Well-Sized Tasks

✅ **Good (S):**
> Create `users` table migration with fields: id (UUID), email (unique), password_hash, created_at, updated_at

✅ **Good (S):**
> Implement `POST /auth/register` endpoint: validate body, hash password with bcrypt, insert user, return 201 + userId

✅ **Good (M):**
> Implement full CRUD for `/products` resource: GET list (paginated), GET by id, POST create, PUT update, DELETE soft-delete

❌ **Too large (should be L → split):**
> Implement the entire authentication system

❌ **Too vague (no done condition):**
> Set up the database stuff

❌ **Hidden dependency (missing prerequisite task):**
> Write tests for the payment service — (where is the "create payment service" task?)
