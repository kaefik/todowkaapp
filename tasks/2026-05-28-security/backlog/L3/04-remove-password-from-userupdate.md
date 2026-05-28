### L3-04 — Удалить password из UserUpdate — смена только через /auth/change-password (C-01)

**Goal:** Запретить смену пароля через PATCH /users/me без подтверждения текущего.
**Input:** `backend/app/schemas/user.py:65`, `backend/app/api/users.py:149`.
**Output:** Поле `password` удалено из `UserUpdate`.
**Done when:** PATCH /users/me не принимает поле password.
**Acceptance criteria:**
- [ ] `password: str | None = None` удалён из `UserUpdate`
- [ ] Соответствующий `field_validator('password')` удалён из `UserUpdate`
- [ ] Код в `update_current_user` убирающий password из update_data — удалён
- [ ] Смена пароля работает только через `/auth/change-password`
- [ ] Существующие тесты обновлены
**depends_on:** []
**impact:** 5
**complexity:** 1
**risk:** 2
**priority_score:** 12.0
**Est. effort:** XS
