### L2/05 — Добавить `max_instances=1` для всех scheduler jobs (BUG-7b)

**Goal:** Предотвратить параллельное выполнение scheduler tick'ов добавлением `max_instances=1` ко всем jobs.

**Input:**
- Текущий код: `backend/app/scheduler.py:22-64` (метод startup)

**Output:**
- Обновлённый `backend/app/scheduler.py` — все `add_job()` вызовы содержат `max_instances=1`

**Done when:**
1. Все 5 `add_job()` вызовов в `startup()` содержат параметр `max_instances=1`

**Acceptance criteria:**
- [ ] `add_job(self._job_generate_recurring_tasks, ..., max_instances=1)`
- [ ] `add_job(self._job_send_due_reminders, ..., max_instances=1)`
- [ ] `add_job(self._job_cleanup_old_notifications, ..., max_instances=1)`
- [ ] `add_job(self._job_startup_recovery, ..., max_instances=1)`
- [ ] `add_job(self._job_cleanup_old_trash, ..., max_instances=1)`

**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 2
**priority_score:** 10.0
**Est. effort:** XS

**LLM Prompt Hint:** "Добавь max_instances=1 ко всем вызовам self.scheduler.add_job() в методе startup() класса TaskScheduler в backend/app/scheduler.py. Это предотвратит параллельное выполнение tick'ов."
