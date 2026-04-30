### L3-11 — Auth интеграция: session tracking

**Goal:** Интегрировать создание/обновление/удаление Session в существующий auth flow.

**Input:** SessionService (L2-04). `backend/app/api/auth.py`.

**Output:** Обновлённый `auth.py` с session tracking.

**Done when:** Login создаёт Session и возвращает session_id, Refresh обновляет activity, Logout удаляет Session.

**Acceptance criteria:**
- [ ] **Login** (`POST /api/auth/login`): после успешного входа — `SessionService.create_session(user_id, refresh_jti, user_agent, ip)`. В response JSON добавить поле `session_id`. Извлечь User-Agent из `request.headers.get("user-agent")`, IP из `request.client.host`.
- [ ] **Refresh** (`POST /api/auth/refresh`): после успешного refresh — `SessionService.update_activity(jti)`.
- [ ] **Logout** (`POST /api/auth/logout`): удалить Session по JTI refresh токена.
- [ ] **Change password** (`POST /api/auth/change-password`): `SessionService.revoke_all_sessions(user_id, current_jti)` — завершить все сессии кроме текущей.
- [ ] Response схемa login обновлена: поле `session_id: str | None`
- [ ] Не ломает существующий auth flow — все текущие тесты проходят

**depends_on:** [L2-04, L3-08]

**impact:** 5 | **complexity:** 3 | **risk:** 2
**priority_score:** 8.0
**Est. effort:** M (~2h)
