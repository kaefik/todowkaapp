### L2/04 — Добавить recovery job `_job_reminder_recovery()` (BUG-3)

**Goal:** Создать one-shot job при старте сервера, который отправляет все пропущенные напоминания (найденные через `find_due_tasks()`).

**Input:**
- Текущий код: `backend/app/scheduler.py:22-64` (метод startup)
- Обновлённые `find_due_tasks()` (L2/01) и `send_reminder()` (L2/02)
- Полный код из дизайн-документа: строки 198-262

**Output:**
- Обновлённый `backend/app/scheduler.py` — новый метод `_job_reminder_recovery()` + регистрация в `startup()`

**Done when:**
1. Метод `_job_reminder_recovery()` создан как `@staticmethod`
2. Использует `find_due_tasks()` для поиска пропущенных напоминаний
3. Итерирует с tuple unpacking, вызывает `send_reminder(task, user, offset_minutes)`
4. Per-task commit/rollback
5. Зарегистрирован в `startup()` как `'date'` job с `run_date=datetime.now()`

**Acceptance criteria:**
- [ ] Метод `_job_reminder_recovery` определён в классе TaskScheduler
- [ ] Tuple unpacking: `for task, offset_minutes in due_items:`
- [ ] Проверка `if task.user:` перед отправкой
- [ ] `await session.commit()` после каждой успешной отправки
- [ ] `await session.rollback()` в except-блоке
- [ ] EventBus publish после отправки (для SSE, хотя при старте подключений нет)
- [ ] Регистрация в startup: `self.scheduler.add_job(self._job_reminder_recovery, 'date', run_date=datetime.now(), id='reminder_recovery', replace_existing=True, max_instances=1)`

**depends_on:** [L2/01, L2/02]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** 6.0
**Est. effort:** S

**LLM Prompt Hint:** "Добавь метод _job_reminder_recovery в TaskScheduler в backend/app/scheduler.py. One-shot job при старте: вызывает find_due_tasks(), отправляет пропущенные напоминания через send_reminder с tuple unpacking. Per-task commit/rollback. Зарегистрируй в startup() как 'date' job. Следуй полному коду из дизайн-документа."
