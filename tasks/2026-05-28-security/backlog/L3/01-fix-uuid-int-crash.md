### L3-01 — Исправить int() краш на UUID в telegram_auth (T-03)

**Goal:** Убрать lossy-конверсию UUID→int, вернуть UUID как строку.
**Input:** `backend/app/api/telegram_auth.py:31`, `backend/app/schemas/telegram_auth.py:7`.
**Output:** `UserResponse.id: str` вместо `int`, убрана `int()` конверсия.
**Done when:** Telegram login не крашится на реальных UUID.
**Acceptance criteria:**
- [ ] `UserResponse` в `schemas/telegram_auth.py`: `id: int` → `id: str`
- [ ] В `api/telegram_auth.py` убрано `int(user_model.id.replace("-", "")[:8])`
- [ ] Используется `str(user_model.id)` для передачи id
- [ ] Ответ содержит валидный UUID в поле id
**depends_on:** []
**impact:** 5
**complexity:** 1
**risk:** 2
**priority_score:** 12.0
**Est. effort:** XS
