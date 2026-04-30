### L3-08 — Session API endpoints

**Goal:** Создать API роутер для управления сессиями.

**Input:** SessionService (L2-04). Паттерн из `backend/app/api/auth.py`.

**Output:** `backend/app/api/sessions.py`. Роутер зарегистрирован в `router.py`.

**Done when:** Все 3 endpoint-а работают.

**Acceptance criteria:**
- [ ] `GET /api/sessions` — список сессий текущего пользователя. Каждый элемент: id, browser, os, device_type, ip_address, created_at, last_activity, is_current. Принимает `current_session_id` query param для определения is_current.
- [ ] `DELETE /api/sessions/{session_id}` — отзыв сессии. Проверяет что session принадлежит текущему пользователю. Отзывает refresh token (добавляет JTI в RevokedToken).
- [ ] `DELETE /api/sessions` — «выйти со всех устройств». Принимает `current_session_id` body param. Удаляет все сессии кроме текущей.
- [ ] Pydantic схемы: `SessionResponse`, `SessionListResponse`
- [ ] Все endpoints защищены `Depends(get_current_user)`
- [ ] Роутер подключён в `backend/app/api/router.py`

**depends_on:** [L2-04]

**impact:** 4 | **complexity:** 2 | **risk:** 1
**priority_score:** 7.5
**Est. effort:** S (~1h)
