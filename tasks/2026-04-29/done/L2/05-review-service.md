### L2-05 — ReviewService

**Goal:** Реализовать сервис для агрегации данных weekly review и сохранения результатов.

**Input:** Модели Task, Project, User (с новыми полями из L1-03).

**Output:** `backend/app/services/review_service.py`

**Done when:** Оба метода реализованы и возвращают корректные данные.

**Acceptance criteria:**
- [ ] `get_review_status(user_id)` — возвращает dict:
  - `inbox_count` — кол-во задач с `gtd_status='inbox'`
  - `inbox_tasks` — список inbox задач (id, title)
  - `active_projects` — проекты с `is_active=True`, каждый с полем `has_next_action` (True если у проекта есть задача с `gtd_status in ('active', 'next')`)
  - `someday_tasks` — задачи с `gtd_status='someday'`
  - `last_review_date` — из User.last_review_at
  - `review_count` — из User.review_count
- [ ] `complete_review(user_id)` — обновляет User.last_review_at=now(), User.review_count+=1, возвращает подтверждение
- [ ] Использует существующий паттерн: `self.db.execute(select(...))`

**depends_on:** [L1-03]

**impact:** 4 | **complexity:** 2 | **risk:** 2
**priority_score:** 7.0
**Est. effort:** M (~2h)
