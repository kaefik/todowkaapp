### L5-22 — Frontend: review reminder banner

**Goal:** Добавить баннер-напоминание о weekly review в sidebar или на главной.

**Input:** Review API (last_review_date). Sidebar компонент.

**Output:** Компонент-баннер, интегрированный в layout.

**Done when:** Баннер показывается если last_review > 7 дней назад, ведёт на /review.

**Acceptance criteria:**
- [ ] Компонент `ReviewReminderBanner` или аналогичный
- [ ] Показывается если `last_review_at` был более 7 дней назад (или никогда)
- [ ] Данные из `GET /api/review/status` или из кэша (можно запросить при загрузке sidebar)
- [ ] Текст: «Время для еженедельного обзора» + кнопка/ссылка «Начать» → /review
- [ ] Акцентный цвет (indigo/yellow)
- [ ] Dismissable (можно закрыть на текущую сессию)
- [ ] Dark mode совместимость

**depends_on:** [L5-21]

**impact:** 3 | **complexity:** 1 | **risk:** 2
**priority_score:** 5.0
**Est. effort:** S (~1h)
