# Plan Critique: Backend API Implementation Plan

**Дата:** 2026-04-07
**Документ:** `docs/plans/2026-04-07-backend-api-implementation-plan.md`
**Критик:** Plan Critic (автоматический)

---

## Step 1 — Five Lenses of Critique

### Lens 1: Completeness

| # | Finding | Severity | Details |
|---|---------|----------|---------|
| C1 | 🔴 **ID type mismatch: models use `str`, plan uses `UUID`** | BLOCKER | Models `User.id` and `Task.id` are `Mapped[str]` (String(36), storing UUID as string). But the plan imports `UUID` everywhere — `AuthService.refresh_tokens(user_id: UUID)`, `TaskService.get_task_by_id(task_id: UUID, user_id: UUID)`, endpoint params like `task_id: UUID`. The schemas (`TaskResponse`, `UserResponse`) also declare `id: UUID`. Pydantic `from_attributes=True` handles the `str→UUID` coercion, but service layer functions accept `UUID` and then compare against `str` column values. This will cause `uuid.UUID("...") != "same-uuid-string"` comparisons in SQLAlchemy queries. **Fix:** Either change service signatures to accept `str`, or add explicit `str()` conversion inside services when building queries. |
| C2 | 🔴 **`get_db()` auto-commits — services also commit → double commit** | BLOCKER | `database.py:get_db()` already does `await session.commit()` on success. But the plan says services should commit internally (e.g., `AuthService.create_user` → "Коммит в БД", `TaskService.create_task` → "Коммит"). This means every service call will commit twice, or worse: if the service commits but the endpoint then raises an exception, `get_db` will try to commit again on an already-committed session. **Fix:** Decide ONE owner of commits. Either: (a) services flush/commit and `get_db` only closes, or (b) `get_db` commits and services only `flush()`. Option (b) is more transactional — if the endpoint fails after service call, everything rolls back. |
| C3 | 🔴 **`app/models/__init__.py` is empty — `conftest.py` imports `from app.models import Base` which will fail** | BLOCKER | The plan's conftest (line 758) does `from app.models import Base`, but `app/models/__init__.py` is empty. `Base` is actually defined in `app.database`. The plan should use `from app.database import Base`. |
| C4 | 🟡 **No `invite_code` field in `RegisterRequest` schema** | WARNING | The plan mentions "Проверка invite_code (если включен)" in the register endpoint, but `RegisterRequest` schema has no `invite_code` field. The config has `invite_code: str | None`, but there's no way for the client to send it. **Fix:** Either add `invite_code: str | None = None` to `RegisterRequest`, or handle it as a query parameter / separate header. |
| C5 | 🟡 **Integration tests use `TestClient` (sync) but are marked `@pytest.mark.asyncio`** | WARNING | Lines 554-557 show `client = TestClient(app)` (synchronous) then tests marked `@pytest.mark.asyncio`. `TestClient` is synchronous and should not be used in async test functions. Also, the conftest later defines an `AsyncClient` fixture. The test files should consistently use `httpx.AsyncClient` via the fixture, not a module-level `TestClient`. **Fix:** Remove module-level `TestClient`, use the `client` fixture from conftest. |
| C6 | 🟡 **`TaskListResponse` schema exists but is never used in the plan** | WARNING | `app/schemas/task.py` defines `TaskListResponse(items: list[TaskResponse], total: int)`, but the plan's `GET /api/tasks` endpoint returns `List[TaskResponse]` directly. The `total` count is never computed. Either remove the schema or use it. |
| C7 | 🟡 **No `toggle_task` endpoint in API despite service method** | WARNING | `TaskService` has `toggle_task()` method, but there's no `PATCH /api/tasks/{id}/toggle` endpoint. If the frontend needs this, it's missing. If not needed, the method is YAGNI. |
| C8 | 🟡 **`get_current_active_user` is defined but never used** | WARNING | `dependencies.py` defines `get_current_active_user` but no endpoint uses it — they all use `get_current_user` directly. The `is_active` check is bypassed. Either use it or remove it. |
| C9 | 🟢 **No CORS cookie configuration for cross-origin refresh tokens** | SUGGESTION | Refresh tokens are in cookies (`httponly`, `secure`, `samesite="strict"`). With `samesite="strict"`, cross-site POST to `/api/auth/refresh` won't send cookies. If the frontend is on a different origin (e.g., `localhost:5173`), this works fine for same-site. But if deployed on different domains, `samesite` should be `"none"` (requires HTTPS). Not a blocker for local dev. |
| C10 | 🟢 **No `pytest.ini_options` in pyproject.toml** | SUGGESTION | `pytest-asyncio` needs configuration. Without `asyncio_mode = "auto"` or explicit markers, tests may fail. Add `[tool.pytest.ini_options]` section. |

---

### Lens 2: Consistency

| # | Finding | Severity | Details |
|---|---------|----------|---------|
| K1 | 🔴 **Plan iteration order is out of dependency order** | BLOCKER | Итерация 1 lists: (1) Auth Service → (2) Auth Dependencies → (3) Auth Endpoints → (4) Task Service → (5) Task Endpoints → (6) Integration Tests. But `dependencies.py` (Фаза 3) references `TaskService` (line 215-216) which doesn't exist until Фаза 2. The file will fail to import. **Fix:** Either: (a) implement Фаза 2 before Фаза 3, or (b) split dependencies.py into auth-only deps first, add task deps after TaskService exists. |
| K2 | 🟡 **`register` endpoint signature uses `Depends(get_db)` directly instead of `get_auth_service`** | WARNING | The plan defines `get_auth_service` factory but `register()` uses `db: AsyncSession = Depends(get_db)` directly (line 246), then the comments say "Получение AuthService". This is inconsistent — other endpoints could use the service factory instead. Either use `Depends(get_auth_service)` consistently or don't define the factory. |
| K3 | 🟡 **`delete` import in TaskService is unused** | WARNING | Line 103 shows `from sqlalchemy import select, delete` but `delete` is never used — the plan says "Поиск задачи → Удаление из сессии", which means `session.delete(task)`, not a bulk `DELETE` query. |
| K4 | 🟢 **`selectinload` imported but never used** | SUGGESTION | Line 104 shows `from sqlalchemy.orm import selectinload` but no query uses it. Tasks don't have relationships that need eager loading (the `user` relationship on Task is never accessed in list endpoints). |

---

### Lens 3: Assumptions & Risks

| # | Assumption | Risk | Severity |
|---|-----------|------|----------|
| A1 | "JWT `decode_token` returns `None` on invalid tokens" — plan checks `if token is None` but doesn't verify `type` claim | An attacker could use an access token to refresh (or vice versa) if the refresh endpoint doesn't verify `type == "refresh"` | 🟡 WARNING |
| A2 | "SQLite can handle concurrent writes" | SQLite locks the entire DB on writes. Under concurrent requests, `OperationalError: database is locked` will occur. Acceptable for MVP, but should be documented. | 🟢 SUGGESTION |
| A3 | "Refresh token in cookie is sufficient for rotation" | No refresh token rotation or revocation. If a refresh token is stolen, it's valid for 7 days with no way to invalidate it server-side. | 🟡 WARNING |
| A4 | "The `get_db()` session management works with services" | `get_db()` auto-commits. If a service method calls `commit()` internally, and then another operation in the same request fails, `get_db()` will try to `rollback()` an already-committed transaction, which is a no-op in SQLAlchemy but semantically wrong. | 🟡 WARNING |

---

### Lens 4: YAGNI & Scope Creep

| # | Feature | Needed for MVP? | Verdict |
|---|---------|----------------|---------|
| Y1 | `TaskService.toggle_task()` | Maybe — could be handled by `update_task(is_completed=not current)` | 🟢 Keep if frontend needs a dedicated endpoint, otherwise remove |
| Y2 | `get_current_active_user()` | No — `is_active` field exists but there's no way to deactivate users | 🟡 Remove until user admin is implemented |
| Y3 | `TaskListResponse` with `total` count | No pagination metadata needed for MVP | 🟢 Keep schema, skip implementation |
| Y4 | `AuthService.get_user_by_username()` / `get_user_by_email()` | Only needed internally by `create_user` for duplicate checks | 🟢 Keep as private methods, don't expose |

Overall: Plan scope is appropriate. The "Дополнительные улучшения" section properly defers future features.

---

### Lens 5: Technical Feasibility

| # | Concern | Severity | Details |
|---|---------|----------|---------|
| T1 | 🔴 **`datetime.utcnow()` is deprecated in Python 3.12+** | BLOCKER | `security.py` uses `datetime.utcnow()` which is deprecated since Python 3.12. The project targets Python 3.12+. This should be fixed in security.py before building on top of it. **Fix:** Replace with `datetime.now(timezone.utc)`. Not a plan blocker per se, but the plan should note this. |
| T2 | 🟡 **`httpx` in main dependencies instead of dev** | WARNING | `httpx` is listed in main `dependencies` in pyproject.toml but is only needed for tests. Should be moved to `[project.optional-dependencies] dev`. Not a plan issue but worth noting. |
| T3 | 🟢 **No database seeding / initial migration run in tests** | SUGGESTION | Conftest creates tables via `Base.metadata.create_all`, which works for SQLite in-memory. But if Alembic migrations diverge from model definitions, tests may pass while production fails. Acceptable for MVP. |

---

## Step 2 — Assumption Inversion

### Inversion 1

```
Assumption: Service methods can safely call commit() because get_db() handles the session lifecycle.
Inversion:  Services should NOT commit — get_db() owns the transaction.
Impact:     If services commit internally, partial writes can't be rolled back when later
            operations fail. E.g., register creates user (commits) → token generation fails →
            user exists but client gets error → can't retry registration.
Mitigation: Services should only flush(). Let get_db() commit. This preserves atomicity:
            if anything fails after the service call, the entire request is rolled back.
```

### Inversion 2

```
Assumption: UUID type coercion between models (str) and schemas (UUID) "just works".
Inversion:  Service layer compares UUID objects against string column values, causing
            silent filter mismatches — queries return no results.
Impact:     SQLAlchemy won't crash but filters like `User.id == user_id` where
            `user_id` is a `uuid.UUID` object and `User.id` is a `String(36)` column
            will silently fail to match in some dialects.
Mitigation: Explicitly convert to str in service methods: `str(user_id)` when building queries,
            or define a custom column type. For SQLite this actually works via string comparison,
            but it's fragile.
```

### Inversion 3

```
Assumption: Refresh tokens in httpOnly cookies are secure enough without server-side tracking.
Inversion:  There's no way to invalidate a refresh token server-side. If a token is leaked,
            the attacker has 7 days of access.
Impact:     No "logout from all devices" capability. No ability to revoke compromised tokens.
Mitigation: For MVP: document this limitation. Phase 2: add a `refresh_tokens` table to track
            valid tokens and support revocation.
```

---

## Step 3 — Missing Scenarios

| # | Scenario | Risk | Suggested Handling |
|---|----------|------|--------------------|
| M1 | User submits `description` exceeding DB `Text` column limit | 🟢 | SQLite has no TEXT limit; add max_length to schema if needed |
| M2 | Concurrent registration with same username/email | 🟡 | Database unique constraint handles this, but the service should catch `IntegrityError` and return a clean error, not 500 |
| M3 | Expired access token used for authenticated request | 🟢 | `get_current_user` calls `decode_token` which returns `None` for expired tokens → 401. Client should handle by refreshing. Document this flow. |
| M4 | Refresh endpoint receives an `access` type token instead of `refresh` | 🔴 | The plan doesn't verify `type == "refresh"` in the refresh endpoint. An attacker could use a leaked access token to get new tokens. **Must check `payload.get("type") == "refresh"`.** |
| M5 | User is deleted (cascade) but their refresh token cookie still exists | 🟡 | `refresh_tokens` will look up user by ID, get `None`, return 401. Client should redirect to login. Works but should be documented. |
| M6 | `register` endpoint is called with `registration_enabled=False` and no invite code | 🟡 | Plan says "Если отключена - 403" and "Проверка invite_code (если включен)", but `RegisterRequest` has no `invite_code` field. How does the client send it? |
| M7 | Pagination edge cases: `skip=0, limit=0` or `skip=-1` | 🟢 | `Query(ge=0)` and `Query(ge=1)` handle this via FastAPI validation. Covered. |
| M8 | Malformed UUID in URL path `/{task_id}` | 🟢 | FastAPI's `UUID` path parameter type validates format and returns 422. Covered. |

---

## Step 4 — Verdict & Output

### Summary Table

| # | Lens | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| C1 | Completeness | ID type mismatch: models `str` vs plan `UUID` in services | 🔴 BLOCKER | Use `str(user_id)` in queries or change signatures to `str` |
| C2 | Completeness | Double commit: services + get_db() both commit | 🔴 BLOCKER | Services use `flush()` only, `get_db()` owns commits |
| C3 | Completeness | `from app.models import Base` fails — empty `__init__` | 🔴 BLOCKER | Use `from app.database import Base` |
| K1 | Consistency | Dependency order: deps.py imports TaskService before it exists | 🔴 BLOCKER | Reorder: Phase 2 → Phase 3, or split deps file |
| M4 | Missing | Refresh endpoint doesn't verify token `type == "refresh"` | 🔴 BLOCKER | Add `payload.get("type") == "refresh"` check |
| T1 | Feasibility | `datetime.utcnow()` deprecated in Python 3.12+ | 🔴 BLOCKER | Replace with `datetime.now(timezone.utc)` |
| C4 | Completeness | No `invite_code` field in `RegisterRequest` | 🟡 WARNING | Add `invite_code: str \| None = None` to schema |
| C5 | Completeness | Integration tests mix sync `TestClient` with `@pytest.mark.asyncio` | 🟡 WARNING | Use `httpx.AsyncClient` fixture consistently |
| C6 | Completeness | `TaskListResponse` defined but unused | 🟡 WARNING | Use it for paginated response or remove it |
| C7 | Completeness | `toggle_task` service method has no API endpoint | 🟡 WARNING | Add `PATCH /{id}/toggle` or remove method |
| C8 | Completeness | `get_current_active_user` defined but never used | 🟡 WARNING | Use it in endpoints or remove |
| K2 | Consistency | `register` uses `Depends(get_db)` not `Depends(get_auth_service)` | 🟡 WARNING | Use service factories consistently |
| K3 | Consistency | Unused `delete` import in TaskService | 🟡 WARNING | Remove unused import |
| A1 | Assumption | No token type verification in refresh endpoint | 🟡 WARNING | Verify `type == "refresh"` |
| A3 | Assumption | No refresh token revocation mechanism | 🟡 WARNING | Document limitation, plan for Phase 2 |
| A4 | Assumption | Session lifecycle mismatch between get_db and services | 🟡 WARNING | Clarify commit ownership |
| C9 | Completeness | Cookie `samesite="strict"` may block cross-origin | 🟢 SUGGESTION | Consider for production deployment |
| C10 | Completeness | No pytest config in pyproject.toml | 🟢 SUGGESTION | Add `[tool.pytest.ini_options]` |
| K4 | Consistency | Unused `selectinload` import | 🟢 SUGGESTION | Remove unused import |
| Y2 | YAGNI | `get_current_active_user` with no way to deactivate users | 🟢 SUGGESTION | Remove until admin feature exists |

**Total: 6 BLOCKERS, 10 WARNINGS, 5 SUGGESTIONS**

---

### Verdict

```
VERDICT: 🔴 NEEDS REVISION — 6 blockers must be resolved before implementation
```

### Required Fixes (BLOCKERS)

1. **ID types:** Decide on `str` vs `UUID` in service signatures. Models use `str`. Either convert in services or accept `str`.
2. **Commit ownership:** Services should `flush()`, not `commit()`. `get_db()` owns the transaction.
3. **Base import:** conftest must use `from app.database import Base`, not `from app.models import Base`.
4. **Dependency order:** Implement TaskService (Phase 2) before or alongside dependencies.py (Phase 3).
5. **Token type check:** Refresh endpoint must verify `payload["type"] == "refresh"`.
6. **datetime.utcnow():** Fix in security.py before building on top.

### Recommended Fixes (WARNINGS — should resolve)

7. Add `invite_code` field to `RegisterRequest` schema.
8. Unify test client approach — use `httpx.AsyncClient` fixture everywhere.
9. Either use `TaskListResponse` in list endpoint or remove it.
10. Either add toggle endpoint or remove toggle service method.
11. Use `get_auth_service` / `get_task_service` factories consistently in all endpoints.
12. Add `[tool.pytest.ini_options]` with `asyncio_mode = "auto"`.

---

*Critique complete. 6 blockers found — plan needs revision before proceeding to implementation.*
