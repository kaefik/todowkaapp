# Layer Status Assessment Guide

How to determine `done` / `partial` / `missing` for each layer in an existing project.

---

## L0: Foundation

**done** — project runs locally, has config management, dependencies pinned, linting configured
**partial** — runs but missing one of: proper env config, dependency lock file, linter
**missing** — no project structure at all (impossible if you're onboarding an existing project)

**Check:**
- `package.json` / `go.mod` / `requirements.txt` exists and has pinned versions?
- `.env.example` or equivalent exists?
- Linter config (`.eslintrc`, `pyproject.toml[tool.ruff]`, etc.) present?
- CI config (`.github/workflows/`, `.gitlab-ci.yml`) present?

---

## L1: Data Layer

**done** — all entities in the design have schema + migrations, migrations are version-controlled
**partial** — some entities exist, or migrations exist but aren't all run
**missing** — raw SQL or no schema management, entities defined only in code

**Check:**
- Schema file exists (`.prisma`, `schema.ts`, `models.py`, etc.)?
- Migration files present and sequential?
- Can run `migrate` from fresh DB and get working state?
- Seeders / fixtures for development?

---

## L2: Core Business Logic

**done** — services exist for all entities, business rules are isolated from routes
**partial** — some services exist, others have logic inline in controllers
**missing** — all business logic in routes/views, no service layer

**Check:**
- `services/` directory exists?
- Business rules NOT in route handlers (look for complex logic in controller files)?
- Services testable in isolation (no direct DB calls in services)?

---

## L3: API / Interface

**done** — all endpoints documented or discoverable, request/response shapes consistent
**partial** — endpoints exist but inconsistent naming, missing some CRUD operations
**missing** — no API layer, or ad-hoc script-style code

**Check:**
- Routes file structured by resource?
- Consistent naming convention (e.g., RESTful or RPC-style, not mixed)?
- All CRUD operations present for each resource that needs them?
- Request/response shapes typed (TypeScript DTO, Pydantic model, etc.)?

---

## L4: Auth & Security

**done** — auth middleware on all protected routes, role checks where needed, tokens handled securely
**partial** — auth exists but applied inconsistently, or missing role-based access
**missing** — no auth, or auth only on some routes without clear policy

**Check:**
- Auth middleware / guards exist?
- Applied to ALL routes that need it (grep for unprotected endpoints)?
- Role/permission checks for sensitive operations?
- Token storage secure (httpOnly cookies or proper header usage)?
- Refresh token strategy in place?

---

## L5: Integration

**done** — all external services have client wrappers, retry/fallback logic, error handling
**partial** — some integrations exist but called directly without wrappers
**missing** — no external service integrations (note: this may be correct for the project)

**Check:**
- External API calls wrapped in service classes (not inline `fetch()`)?
- Timeout configured on all external calls?
- Fallback behaviour defined (what if service is down)?
- Credentials via env vars, not hardcoded?

---

## L6: Validation & Errors

**done** — all inputs validated at entry points, consistent error response format, errors logged
**partial** — some routes validated, some not; or validation exists but errors inconsistent
**missing** — no input validation, raw user input reaching business logic

**Check:**
- Validation library in use (zod, joi, Pydantic, etc.)?
- Applied at route level (not just in services)?
- Error response format consistent across all endpoints?
- Unexpected errors caught and logged centrally?

---

## L7: Tests

**done** — unit tests for services, integration tests for API endpoints, CI runs tests
**partial** — some tests exist, coverage < 60%, or only one type of test
**missing** — no tests, or tests but they're not running / always failing

**Check:**
- Test runner configured?
- Coverage metric available?
- What percentage of endpoints have integration tests?
- Tests run in CI on every PR?
- Critical user journeys have E2E tests?

**Coverage thresholds:**
- `done`: > 70% line coverage, all critical paths tested
- `partial`: 30–70% coverage, or coverage exists but critical paths untested
- `missing`: < 30% or no tests at all

---

## L8: Docs & Deployment

**done** — README explains setup, API documented (OpenAPI or equivalent), deploy process documented
**partial** — README exists but stale, or API not documented, or deploy is manual/undocumented
**missing** — no README, no API docs, deploy is "ssh and pray"

**Check:**
- README has: setup steps, env vars required, how to run tests?
- API docs: OpenAPI spec, Postman collection, or equivalent?
- Deploy: Dockerfile/Helm/Terraform/scripts present and working?

---

## L9: Observability

**done** — structured JSON logs, request tracing with IDs, key business metrics, alerts configured
**partial** — some logging but not structured, or no metrics, or no correlation IDs
**missing** — `console.log` / `print()` scattered, no metrics, no tracing

**Check:**
- Logging library in use (pino, winston, loguru, zerolog, etc.)?
- Logs output as structured JSON (not string concatenation)?
- Correlation / request ID added to all log lines?
- Metrics endpoint (Prometheus `/metrics`, StatsD, etc.)?
- Alerting configured (on error rate, latency, etc.)?

---

## Quick Assessment Table

Copy this into the as-is document:

```markdown
| Layer | Status | Evidence | Notes |
|-------|--------|----------|-------|
| L0 Foundation | done | package.json, .env.example, CI present | |
| L1 Data Layer | partial | users table exists, products missing | Need 2 more schemas |
| L2 Business | partial | UserService exists, no ProductService | |
| L3 API | partial | /auth routes done, /products missing | |
| L4 Auth | done | JWT middleware on all routes | |
| L5 Integration | missing | No external services yet | Planned: email |
| L6 Validation | partial | Zod on POST /auth, nowhere else | Inconsistent |
| L7 Tests | partial | 38% coverage, only unit tests | No integration tests |
| L8 Docs | missing | No README, no API docs | |
| L9 Observability | missing | console.log only | Critical gap |
```
