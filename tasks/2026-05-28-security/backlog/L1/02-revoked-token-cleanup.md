### L1-02 — Добавить метод очистки истёкших revoked_tokens

**Goal:** Создать периодическую задачу для удаления старых revoked_tokens.
**Input:** Текущий `backend/app/models/revoked_token.py`, существующий APScheduler в проекте.
**Output:** Функция очистки + интеграция с scheduler.
**Done when:** Токены старше refresh_token TTL автоматически удаляются.
**Acceptance criteria:**
- [ ] Функция `cleanup_expired_revoked_tokens()` в services или отдельном модуле
- [ ] Удаляет токены где `revoked_at < now - refresh_token_expire_days`
- [ ] Зарегистрирована как periodic task в APScheduler
- [ ] Unit-тест на логику очистки
**depends_on:** []
**impact:** 3
**complexity:** 2
**risk:** 1
**priority_score:** 3.5
**Est. effort:** S
