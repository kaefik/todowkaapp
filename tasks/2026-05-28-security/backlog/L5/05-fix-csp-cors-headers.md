### L5-05 — Ограничить CSP unsafe-inline и CORS allow_headers (L-05)

**Goal:** Ужесточить CSP и CORS конфигурацию.
**Input:** `backend/app/main.py:80,92`.
**Output:** CSP с nonce-based styles (если возможно) или задокументированное исключение. CORS allow_headers ограничен.
**Acceptance criteria:**
- [ ] CORS: `allow_headers=["*"]` → конкретный список `["Authorization", "Content-Type", "Accept"]`
- [ ] CSP `unsafe-inline` задокументирован как необходимый для Tailwind CSS
- [ ] Если nonce-based CSP возможен с Vite — реализовать (DECISION)
**depends_on:** []
**impact:** 3
**complexity:** 3
**risk:** 3
**priority_score:** 3.0
**Est. effort:** M
**type:** DECISION
