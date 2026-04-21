### L4-01 — Изменить SameSite на lax в security.py

**Goal:** Заменить `samesite="strict"` на `samesite="lax"` во всех четырёх cookie-функциях, чтобы cookie отправлялись при навигации по external links.

**Input:** `backend/app/security.py` (строки 58–103: `set_access_cookie`, `clear_access_cookie`, `set_refresh_cookie`, `clear_refresh_cookie`)

**Output:** Обновлённый `backend/app/security.py` с `samesite="lax"`.

**Done when:** `pytest tests/ -v` проходит. Все четыре функции используют `samesite="lax"`.

**Acceptance criteria:**
- [ ] `set_access_cookie` — `samesite="lax"`
- [ ] `clear_access_cookie` — `samesite="lax"`
- [ ] `set_refresh_cookie` — `samesite="lax"`
- [ ] `clear_refresh_cookie` — `samesite="lax"`
- [ ] Существующие тесты проходят

**depends_on:** []

**impact:** 5
**complexity:** 1
**risk:** 2
**priority_score:** 12.0
**Est. effort:** XS

**LLM Prompt Hint:** В security.py замени samesite="strict" на samesite="lax" во всех четырёх функциях: set_access_cookie, clear_access_cookie, set_refresh_cookie, clear_refresh_cookie.
