### L4-03 — Шифрование секретов в БД — SMTP password + telegram_bot_token (H-02)

**Goal:** Все секреты в БД хранятся зашифрованными через Fernet.
**Input:** CryptoService (L2-02), модели User и system_settings.
**Output:** Прозрачное шифрование/дешифрование секретов при чтении/записи.
**Done when:** Секреты хранятся в зашифрованном виде, миграция plaintext→encrypted выполнена.
**Acceptance criteria:**
- [ ] `telegram_bot_token` шифруется при записи, дешифруется при чтении
- [ ] `smtp_password` в `system_settings` шифруется/дешифруется
- [ ] Migration-скрипт: при запуске с `SECRETS_ENCRYPTION_KEY` — зашифровать все plaintext
- [ ] Флаг `secrets_encrypted` в `system_settings` отслеживает статус
- [ ] Без `SECRETS_ENCRYPTION_KEY` — backward compatible (plaintext)
- [ ] `UserResponse.mask_telegram_token` работает с зашифрованным значением
**depends_on:** [L2/02]
**impact:** 5
**complexity:** 3
**risk:** 4
**priority_score:** 4.7
**Est. effort:** M
