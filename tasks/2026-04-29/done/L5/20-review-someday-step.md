### L5-20 — Frontend: ReviewSomeday (Шаг 3)

**Goal:** Реализовать третий шаг wizard — ревизия Someday/Maybe задач.

**Input:** ReviewWizard (L5-17). Данные из review status (someday_tasks). Task API.

**Output:** `frontend/src/components/review/ReviewSomeday.tsx`

**Done when:** Список someday задач с быстрыми действиями.

**Acceptance criteria:**
- [ ] Список задач в someday: title, (опционально: описание)
- [ ] 3 быстрых действия: «Активировать» (→ active), «В корзину» (→ trash), «Оставить» (без изменений)
- [ ] «Активировать» и «В корзину» — задача исчезает из списка
- [ ] «Оставить» — задача остаётся, визуально помечается как просмотренная
- [ ] Счётчик «Осталось X задач»
- [ ] Empty state если нет someday задач — «Нет задач для обзора»
- [ ] Колбек `onComplete` для кнопки «Завершить обзор»

**depends_on:** [L5-17]

**impact:** 3 | **complexity:** 2 | **risk:** 2
**priority_score:** 6.5
**Est. effort:** S (~1h)
