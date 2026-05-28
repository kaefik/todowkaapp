### L3-03 — Убрать refresh_token из ответа telegram login (T-02)

**Goal:** Не возвращать refresh_token в JSON, использовать короткоживущий access_token.
**Input:** `backend/app/api/telegram_auth.py:28`, `backend/app/services/telegram_auth_service.py`.
**Output:** Только `access_token` с `expires_delta=timedelta(minutes=5)`.
**Done when:** Telegram login не утекает refresh_token, токен живёт 5 минут.
**Acceptance criteria:**
- [ ] `TelegramLoginResponse.refresh_token` удалён или задепрекейчен
- [ ] `login_via_telegram` создаёт access_token с `expires_delta=timedelta(minutes=5)`
- [ ] `refresh_token` больше не генерируется в telegram login
- [ ] `token_type` убран из ответа (связано с T-08)
**depends_on:** [L2/01]
**impact:** 5
**complexity:** 1
**risk:** 2
**priority_score:** 12.0
**Est. effort:** XS
