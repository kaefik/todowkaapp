### L2-01 — HMAC-SHA256 верификация initData (T-01)

**Goal:** Реализовать правильную HMAC-верификацию Telegram initData вместо API-вызова.
**Input:** Текущий `backend/app/services/telegram_auth_service.py`.
**Output:** Метод `_validate_hash()` с HMAC-SHA256 проверкой + проверка свежести `auth_date`.
**Done when:** HMAC-проверка работает с raw query string, `auth_date` проверяется (≤5 мин), старый API-вызов удалён.
**Acceptance criteria:**
- [ ] `_validate_hash(self, init_data: str) -> bool` реализован
- [ ] Использует raw query string значения (НЕ json.loads для user)
- [ ] `hmac.new("WebAppData".encode(), bot_token.encode(), sha256)` для secret_key
- [ ] `hmac.compare_digest()` для безопасного сравнения
- [ ] Проверка `auth_date` — не старше 5 минут
- [ ] `validate_init_data` вызывает `_validate_hash` первым, потом `_parse_init_data`
- [ ] Старый `httpx.post("respondWebAppQuery")` удалён
- [ ] Bare `except Exception: pass` заменён на логирование
**depends_on:** [L0/01]
**impact:** 5
**complexity:** 2
**risk:** 4
**priority_score:** 7.0
**Est. effort:** S

**LLM Prompt Hint:** Перепиши validate_init_data в telegram_auth_service.py: добавь _validate_hash с HMAC-SHA256 через raw query string, проверь auth_date на свежесть (5 мин). Убери httpx-вызов respondWebAppQuery. Замени bare except на логирование.
