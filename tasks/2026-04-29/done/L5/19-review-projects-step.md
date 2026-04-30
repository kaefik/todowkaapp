### L5-19 — Frontend: ReviewProjects (Шаг 2)

**Goal:** Реализовать второй шаг wizard — проверка проектов.

**Input:** ReviewWizard (L5-17). Данные из review status (active_projects). Task API.

**Output:** `frontend/src/components/review/ReviewProjects.tsx`

**Done when:** Список проектов с индикаторами next action и возможностью добавить задачу.

**Acceptance criteria:**
- [ ] Список активных проектов: название, кол-во задач
- [ ] Красный индикатор/бейдж «Нет next action» если `has_next_action === false`
- [ ] Зелёный индикатор если next action есть
- [ ] Кнопка «Добавить next action» — раскрывает inline mini-form: input title + кнопка «Создать»
- [ ] Mini-form создаёт задачу через `POST /api/tasks` с `project_id`, `gtd_status='active'`
- [ ] После создания — индикатор меняется на зелёный
- [ ] Колбек `onComplete` для кнопки «Далее»
- [ ] Empty state если нет активных проектов

**depends_on:** [L5-17]

**impact:** 3 | **complexity:** 2 | **risk:** 2
**priority_score:** 6.5
**Est. effort:** S (~1h)
