### L2-04 — SessionService

**Goal:** Реализовать сервис для управления сессиями (CRUD + cleanup).

**Input:** Модель Session (L1-02). Паттерн из существующих сервисов (например TaskService).

**Output:** `backend/app/services/session_service.py`

**Done when:** Все методы сервис-класса реализованы.

**Acceptance criteria:**
- [ ] `create_session(user_id, refresh_jti, user_agent_raw, ip_address)` — парсит UA через user-agents библиотеку, создаёт Session, возвращает её
- [ ] `get_user_sessions(user_id)` — возвращает список Session с полем `is_current` (вычисляется)
- [ ] `revoke_session(session_id, user_id)` — удаляет Session + добавляет JTI в RevokedToken
- [ ] `revoke_all_sessions(user_id, current_jti)` — удаляет все Session кроме текущей (по JTI), добавляет JTI в RevokedToken для каждой
- [ ] `update_activity(refresh_jti)` — обновляет last_activity
- [ ] `cleanup_expired(days=30)` — удаляет сессии старше N дней
- [ ] UA парсинг: извлекает browser, os, device_type. Добавить `user-agents` в pyproject.toml.

**depends_on:** [L1-02]

**impact:** 4 | **complexity:** 3 | **risk:** 2
**priority_score:** 7.5
**Est. effort:** M (~2h)
