### L4-12 — Security headers middleware

**Goal:** Добавить FastAPI middleware для установки security headers во все responses.

**Input:** `backend/app/main.py`.

**Output:** Middleware в `main.py` или отдельный файл `backend/app/middleware.py`.

**Done when:** Все responses содержат security headers.

**Acceptance criteria:**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'` — с учётом Tailwind inline стилей
- [ ] Headers не ломают SSE (проверить `/api/sse/*`)
- [ ] Headers не ломают existing API (проверить /health, /api/auth/*)

**depends_on:** []

**impact:** 3 | **complexity:** 1 | **risk:** 2
**priority_score:** 5.0
**Est. effort:** S (~1h)
