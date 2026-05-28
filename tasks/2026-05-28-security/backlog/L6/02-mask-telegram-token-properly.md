### L6-02 — Telegram bot token маскировка — показывать только последние N символов (L-04)

**Goal:** Корректная маскировка telegram_bot_token в ответах API.
**Input:** `backend/app/schemas/user.py:53`.
**Output:** Токен маскируется перед отправкой клиенту.
**Acceptance criteria:**
- [ ] `mask_telegram_token` показывает `*****` + последние 5 символов
- [ ] Работает с зашифрованными значениями (дешифровать потом маскировать)
- [ ] Если токен ≤ 5 символов — показать `*****`
**depends_on:** [L4/03]
**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS
