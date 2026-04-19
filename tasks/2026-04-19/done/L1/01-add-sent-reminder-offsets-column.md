### L1/01 — Добавить колонку `sent_reminder_offsets` в Task + Alembic миграцию

**Goal:** Создать новую JSON-колонку `sent_reminder_offsets` в модели Task для отслеживания отправленных offset-напоминаний и Alembic миграцию.

**Input:**
- Текущая модель Task: `backend/app/models/task.py`
- Текущие миграции: `backend/alembic/versions/`

**Output:**
- Обновлённый `backend/app/models/task.py` с новой колонкой `sent_reminder_offsets`
- Новый файл миграции в `backend/alembic/versions/` (upgrade + downgrade)

**Done when:**
1. Колонка `sent_reminder_offsets` добавлена в модель Task (тип JSON, default=`[]`, nullable=True)
2. Миграция `alembic upgrade head` выполняется без ошибок
3. Миграция `alembic downgrade -1` выполняется без ошибок (DROP COLUMN)
4. Существующая колонка `reminder_offsets` НЕ затронута

**Acceptance criteria:**
- [ ] В модели Task: `sent_reminder_offsets: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)`
- [ ] Upgrade миграция: `ALTER TABLE tasks ADD COLUMN sent_reminder_offsets JSON DEFAULT '[]'`
- [ ] Upgrade миграция: `UPDATE tasks SET sent_reminder_offsets = '[]' WHERE sent_reminder_offsets IS NULL`
- [ ] Downgrade миграция: `ALTER TABLE tasks DROP COLUMN sent_reminder_offsets`
- [ ] `alembic upgrade head` проходит успешно
- [ ] `alembic downgrade -1` проходит успешно

**depends_on:** []
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** 11.0
**Est. effort:** XS

**LLM Prompt Hint:** "Добавь колонку sent_reminder_offsets (JSON, default=[]) в SQLAlchemy модель Task в backend/app/models/task.py и создай Alembic миграцию. Upgrade: ADD COLUMN + UPDATE SET '[]'. Downgrade: DROP COLUMN. Не трогай существующую колонку reminder_offsets."
