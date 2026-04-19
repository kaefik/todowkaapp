### L2/08 — SQL-фильтрация в `find_due_tasks()` — не загружать задачи без напоминаний (BUG-7)

**Goal:** Добавить SQL-фильтр `or_(Task.reminder_time.isnot(None), Task.reminder_offsets.isnot(None))` в запрос `find_due_tasks()` для исключения задач без напоминаний из выборки.

**Input:**
- Обновлённый `find_due_tasks()` (L2/01)
- Текущий SQL-запрос: `backend/app/services/reminder_service.py:24-31`

**Output:**
- Обновлённый `backend/app/services/reminder_service.py` — SQL-запрос в `find_due_tasks()`

**Done when:**
1. SQL-запрос содержит фильтр `or_(Task.reminder_time.isnot(None), Task.reminder_offsets.isnot(None))`
2. LIMIT НЕ добавлен

**Acceptance criteria:**
- [ ] В `.where()` добавлено: `or_(Task.reminder_time.isnot(None), Task.reminder_offsets.isnot(None))`
- [ ] Импорт `or_` из `sqlalchemy` присутствует
- [ ] Нет LIMIT в запросе
- [ ] Существующие фильтры `Task.due_date.isnot(None)` и `Task.is_completed.is_(False)` сохранены

**depends_on:** [L2/01]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS

**LLM Prompt Hint:** "Добавь SQL-фильтр в find_due_tasks в backend/app/services/reminder_service.py. В .where() добавь or_(Task.reminder_time.isnot(None), Task.reminder_offsets.isnot(None)). НЕ добавляй LIMIT. Импортируй or_ из sqlalchemy."
