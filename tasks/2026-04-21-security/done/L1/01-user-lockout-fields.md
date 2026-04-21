### L1-01 — Добавить поля блокировки в User model + Alembic миграция

**Goal:** Добавить поля `failed_login_attempts` (int, default=0) и `locked_until` (DateTime, nullable) в модель User. Создать Alembic миграцию.

**Input:** `backend/app/models/user.py` (строки 13–21: текущие поля User)

**Output:**
- Обновлённый `backend/app/models/user.py` с двумя новыми полями
- Новая миграция в `backend/alembic/versions/`

**Done when:** `alembic upgrade head` проходит. Модель User содержит `failed_login_attempts` и `locked_until`. `pytest tests/ -v` проходит.

**Acceptance criteria:**
- [ ] `failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)` добавлено в User
- [ ] `locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)` добавлено
- [ ] Импорт `datetime` добавлен если нужно
- [ ] Alembic миграция создана с `server_default=text('0')` для `failed_login_attempts`
- [ ] `alembic upgrade head` проходит без ошибок
- [ ] Существующие строки в SQLite получают `failed_login_attempts=0`

**depends_on:** []

**impact:** 4
**complexity:** 2
**risk:** 2
**priority_score:** 5.0
**Est. effort:** S

**LLM Prompt Hint:** В models/user.py добавь failed_login_attempts (int, default=0, nullable=False) и locked_until (DateTime timezone, nullable). Создай alembic миграцию с server_default=text('0') для failed_login_attempts.
