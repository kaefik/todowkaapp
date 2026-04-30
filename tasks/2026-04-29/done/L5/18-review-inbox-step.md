### L5-18 — Frontend: ReviewInbox (Шаг 1)

**Goal:** Реализовать первый шаг wizard — обработка Inbox задач.

**Input:** ReviewWizard (L5-17). Данные из `GET /api/review/status` (inbox_tasks). Task API для перемещения задач.

**Output:** `frontend/src/components/review/ReviewInbox.tsx`

**Done when:** Можно просмотреть все inbox задачи и распределить их по категориям.

**Acceptance criteria:**
- [ ] Список всех inbox задач с title
- [ ] 3 быстрых действия на задачу: «Сделать» (→ active), «Когда-нибудь» (→ someday), «Удалить» (→ trash)
- [ ] Dropdown «Ещё» → «В проект» — показывает список проектов, при выборе перемещает задачу в проект с gtd_status=active
- [ ] Счётчик «Обработано X из Y»
- [ ] Индикатор «Inbox пуст!» когда все обработаны (зелёная иконка)
- [ ] Обработанная задача анимированно исчезает из списка
- [ ] Использует существующие API: PATCH /api/tasks/{id} для изменения gtd_status
- [ ] Колбек `onComplete` когда все задачи обработаны (автопереход на шаг 2 или кнопка «Далее»)
- [ ] Responsive: на мобильном actions в виде icon buttons

**depends_on:** [L5-17]

**impact:** 4 | **complexity:** 3 | **risk:** 2
**priority_score:** 7.5
**Est. effort:** M (~2h)
