### L5-03 — Добавить HSTS заголовок (M-04)

**Goal:** Strict-Transport-Security заголовок в production.
**Input:** `backend/app/main.py:70`.
**Output:** HSTS заголовок добавляется в production.
**Done when:** В production ответ содержит Strict-Transport-Security.
**Acceptance criteria:**
- [ ] `SecurityHeadersMiddleware` добавляет HSTS в production
- [ ] `max-age=31536000; includeSubDomains`
- [ ] В development HSTS НЕ добавляется
**depends_on:** []
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
