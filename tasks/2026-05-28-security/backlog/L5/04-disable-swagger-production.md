### L5-04 — Отключить Swagger UI в production (L-01)

**Goal:** `/docs` и `/openapi.json` недоступны в production.
**Input:** `backend/app/main.py:60`.
**Output:** docs_url=None, redoc_url=None в production.
**Done when:** В production Swagger недоступен.
**Acceptance criteria:**
- [ ] `create_app()` в production: `docs_url=None`, `redoc_url=None`
- [ ] В development — доступны как раньше
- [ ] `/openapi.json` тоже недоступен в production
**depends_on:** []
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
