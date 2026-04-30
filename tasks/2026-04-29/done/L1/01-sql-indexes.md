### L1-01 — SQL-индексы: миграция + обновление моделей

**Goal:** Добавить недостающие индексы для user_id в таблицах projects, areas, contexts, verb_templates и композитный индекс (user_id, updated_at) для tasks.

**Input:** Текущие модели в `backend/app/models/` (project.py, area.py, context.py, verb_template.py, task.py). Последняя миграция `1c317004391a`.

**Output:** Новая Alembic миграция. Обновлённые модели с `index=True`.

**Done when:**
- `alembic upgrade head` выполняется без ошибок
- `.Indexes` появляются в схеме БД

**Acceptance criteria:**
- [ ] Миграция создаёт 5 индексов: `ix_projects_user_id`, `ix_areas_user_id`, `ix_contexts_user_id`, `ix_verb_templates_user_id`, `ix_tasks_user_updated`
- [ ] `Project.user_id` имеет `index=True`
- [ ] `Area.user_id` имеет `index=True`
- [ ] `Context.user_id` имеет `index=True`
- [ ] `VerbTemplate.user_id` имеет `index=True`
- [ ] `Task.__table_args__` включает композитный индекс `(user_id, updated_at)`
- [ ] Миграция имеет `downgrade()` который удаляет все 5 индексов

**depends_on:** []

**impact:** 3 | **complexity:** 1 | **risk:** 1
**priority_score:** 9.0
**Est. effort:** S (~1h)

**LLM Prompt Hint:**
Создай Alembic миграцию для добавления 5 индексов. Обнови модели SQLAlchemy — добавь index=True в user_id колонки и композитный индекс в __table_args__. Следуй паттерну существующих миграций в backend/alembic/versions/. Revision ID должен быть уникальным. Downgrade revision = `1c317004391a`.
