### L3-06 — Убрать token_type="bearer" из TelegramLoginResponse (T-08)

**Goal:** Удалить misleading поле `token_type` из ответа telegram login.
**Input:** `backend/app/schemas/telegram_auth.py:23`.
**Output:** `TelegramLoginResponse` без `token_type`.
**Done when:** Поле удалено, клиенты не ломаются.
**Acceptance criteria:**
- [ ] `token_type: str = "bearer"` удалён из `TelegramLoginResponse`
- [ ] Ответ telegram login не содержит token_type
**depends_on:** []
**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS
