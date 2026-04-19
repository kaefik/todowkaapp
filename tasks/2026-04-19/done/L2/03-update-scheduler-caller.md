### L2/03 — Обновить scheduler `_job_send_due_reminders()` — tuple unpacking (BUG-14)

**Goal:** Обновить метод scheduler для работы с новым return type `list[tuple[Task, int | None]]` от `find_due_tasks()` и убрать дублирующий SQL-запрос user.

**Input:**
- Текущий код: `backend/app/scheduler.py:100-140`
- Обновлённый `find_due_tasks()` (L2/01) — возвращает кортежи
- Обновлённый `send_reminder()` (L2/02) — принимает offset_minutes
- Полный код из дизайн-документа: строки 466-503

**Output:**
- Обновлённый `backend/app/scheduler.py` — метод `_job_send_due_reminders()`

**Done when:**
1. Итерация: `for task, offset_minutes in due_items:` (вместо `for task in due_tasks:`)
2. User берётся из `task.user` (уже загружен через selectinload) — нет отдельного SQL-запроса
3. `offset_minutes` передаётся в `send_reminder(task, user, offset_minutes)`

**Acceptance criteria:**
- [ ] Переменная `due_items = await reminder_service.find_due_tasks()`
- [ ] Итерация: `for task, offset_minutes in due_items:`
- [ ] User: `user = task.user` (без отдельного `select(User).where(User.id == task.user_id)`)
- [ ] Вызов: `await reminder_service.send_reminder(task, user, offset_minutes)`
- [ ] Per-task commit/rollback в try/except

**depends_on:** [L2/01, L2/02]
**impact:** 5
**complexity:** 1
**risk:** 3
**priority_score:** 13.0
**Est. effort:** XS

**LLM Prompt Hint:** "Обнови _job_send_due_reminders в backend/app/scheduler.py. Используй tuple unpacking: for task, offset_minutes in due_items. Бери user из task.user (уже загружен). Передавай offset_minutes в send_reminder. Убери импорт User и отдельный SQL-запрос. Следуй коду из дизайн-документа."
