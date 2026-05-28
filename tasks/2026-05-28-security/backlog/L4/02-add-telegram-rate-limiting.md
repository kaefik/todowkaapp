### L4-02 — Добавить rate limiting на telegram_auth эндпоинты (T-05)

**Goal:** Все 4 эндпоинта telegram_auth защищены rate limiting. Параметр `request: Request` добавлен для slowapi.
**Input:** `backend/app/api/telegram_auth.py`.
**Output:** Все эндпоинты с `@limiter.limit`, `request: Request` для slowapi, Pydantic body переименован в `data`.
**Done when:** Все telegram-эндпоинты имеют rate limiting.
**Acceptance criteria:**
- [ ] `/telegram/login`: `@limiter.limit("5/minute")`, `request: Request` + `data: TelegramLoginRequest`
- [ ] `/telegram/bind`: `@limiter.limit(write_limit)`, `request: Request` + `data: TelegramBindRequest`
- [ ] `/telegram/bind-link`: `@limiter.limit(read_limit)`, `request: Request`
- [ ] `/telegram/logout`: rate limit добавлен
- [ ] Все обращения `request.init_data` → `data.init_data`, `request.token` → `data.token`
- [ ] Импортирован `limiter` из `rate_limit.py`
**depends_on:** [L3/01, L3/02, L3/03, L3/05, L3/07]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** 6.0
**Est. effort:** S
