### L1-02 — Модель Session: миграция + ORM

**Goal:** Создать модель Session для отслеживания активных пользовательских сессий.

**Input:** Существующая модель User (`backend/app/models/user.py`, id = String(36) UUID). Паттерн из других моделей.

**Output:**
- `backend/app/models/session.py` — ORM модель
- Обновлённый `backend/app/models/__init__.py`
- Alembic миграция для таблицы `sessions`

**Done when:** Таблица `sessions` создаётся при `alembic upgrade head`.

**Acceptance criteria:**
- [ ] Модель `Session` с полями: `id` (String(36), UUID, PK), `user_id` (String(36), FK→users.id, SET NULL), `refresh_token_jti` (String(36), unique), `user_agent_raw` (Text, nullable), `browser` (String(100), nullable), `os` (String(100), nullable), `device_type` (String(20), nullable), `ip_address` (String(45), nullable), `created_at` (datetime), `last_activity` (datetime)
- [ ] Индекс на `user_id`
- [ ] Индекс unique на `refresh_token_jti`
- [ ] relationship `user` → `User`
- [ ] Миграция с корректным downgrade
- [ ] `__init__.py` обновлён (импорт Session)

**depends_on:** []

**impact:** 4 | **complexity:** 2 | **risk:** 1
**priority_score:** 8.0
**Est. effort:** S (~1h)
