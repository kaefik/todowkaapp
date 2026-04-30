### L2-07 — RevokedToken cleanup job

**Goal:** Добавить фоновую задачу для периодической очистки истёкших revoked tokens.

**Input:** Модель RevokedToken (`backend/app/models/revoked_token.py`). APScheduler уже интегрирован в `main.py` lifespan.

**Output:** Фоновая задача, зарегистрированная в lifespan.

**Done when:** Задача выполняется раз в сутки, удаляет записи старше 7 дней.

**Acceptance criteria:**
- [ ] Функция `cleanup_revoked_tokens(db)` — удаляет RevokedToken записи где `revoked_at < now() - 7 days`
- [ ] Зарегистрирована в APScheduler через `scheduler.add_job` с `trigger="interval", hours=24`
- [ ] Запускается в lifespan startup (рядом с существующими jobs если есть)
- [ ] Логирует кол-во удалённых записей

**depends_on:** []

**impact:** 2 | **complexity:** 1 | **risk:** 2
**priority_score:** 5.0
**Est. effort:** S (~1h)
