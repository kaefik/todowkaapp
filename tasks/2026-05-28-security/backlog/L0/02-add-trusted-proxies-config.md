### L0-02 — Добавить TRUSTED_PROXIES и SECRETS_ENCRYPTION_KEY в конфигурацию

**Goal:** Добавить новые переменные окружения для security-исправлений.
**Input:** Текущий `backend/app/config.py`.
**Output:** Обновлённый `config.py` с `trusted_proxies: str` и `secrets_encryption_key: str | None`.
**Done when:** Config парсит новые переменные, `.env.example` обновлён.
**Acceptance criteria:**
- [ ] `trusted_proxies: str = ""` в Settings (список IP через запятую)
- [ ] `secrets_encryption_key: str | None = None` в Settings
- [ ] `.env.example` содержит комментарии для новых переменных
- [ ] Существующие настройки не сломаны
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS

**LLM Prompt Hint:** Добавь два поля в Settings в config.py: `trusted_proxies: str = ""` и `secrets_encryption_key: str | None = None`. Обнови .env.example.
