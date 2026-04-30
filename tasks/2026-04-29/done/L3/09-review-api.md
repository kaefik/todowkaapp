### L3-09 — Review API endpoints

**Goal:** Создать API роутер для weekly review.

**Input:** ReviewService (L2-05).

**Output:** `backend/app/api/review.py`. Роутер зарегистрирован в `router.py`.

**Done when:** Оба endpoint-а работают.

**Acceptance criteria:**
- [ ] `GET /api/review/status` — возвращает агрегированные данные (inbox_count, inbox_tasks, active_projects с has_next_action, someday_tasks, last_review_date, review_count). Защищён.
- [ ] `POST /api/review/complete` — фиксирует завершение review. Обновляет last_review_at=now(), review_count+=1. Возвращает `{"success": true, "review_count": N, "completed_at": "..."}`. Защищён.
- [ ] Pydantic схемы: `ReviewStatusResponse`, `ReviewCompleteResponse`, `ProjectReviewItem`, `TaskReviewItem`
- [ ] Роутер подключён в `backend/app/api/router.py`

**depends_on:** [L2-05]

**impact:** 4 | **complexity:** 2 | **risk:** 1
**priority_score:** 7.0
**Est. effort:** S (~1h)
