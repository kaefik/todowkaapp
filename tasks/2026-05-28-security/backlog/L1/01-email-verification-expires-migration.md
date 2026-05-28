### L1-01 — Добавить поле email_verification_code_expires_at + миграция

**Goal:** Добавить server-side срок действия кода верификации email.
**Input:** Текущий `backend/app/models/user.py`, Alembic.
**Output:** Новое поле в модели User, миграция Alembic.
**Done when:** Миграция создана и применима.
**Acceptance criteria:**
- [ ] `email_verification_code_expires_at: Mapped[datetime | None]` в User
- [ ] Миграция `alembic revision --autogenerate` создана
- [ ] `alembic upgrade head` проходит без ошибок
- [ ] Поле nullable, по умолчанию NULL (обратная совместимость)
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
