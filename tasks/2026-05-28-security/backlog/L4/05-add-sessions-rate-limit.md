### L4-05 — Добавить rate limiting на /sessions эндпоинты (L-07)

**Goal:** Защитить эндпоинты управления сессиями rate limiting.
**Input:** `backend/app/api/sessions.py`.
**Output:** Все эндпоинты sessions с `@limiter.limit`.
**Done when:** Sessions API защищён от abuse.
**Acceptance criteria:**
- [ ] `GET /sessions`: `@limiter.limit(read_limit)`
- [ ] `DELETE /sessions/{id}`: `@limiter.limit(write_limit)`
- [ ] `DELETE /sessions`: `@limiter.limit(write_limit)`
- [ ] Добавлен `request: Request` параметр для slowapi
- [ ] Импортирован `limiter` из `rate_limit.py`
**depends_on:** []
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
