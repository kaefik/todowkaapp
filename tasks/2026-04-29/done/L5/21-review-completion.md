### L5-21 — Frontend: Review completion + stats

**Goal:** Экран завершения review с вызовом API и редиректом.

**Input:** Все 3 шага wizard (L5-18, L5-19, L5-20). Review API.

**Output:** Экран завершения в ReviewWizard или отдельный компонент.

**Done when:** После прохождения 3 шагов — экран статистики, API вызывается, редирект на главную.

**Acceptance criteria:**
- [ ] Экран «Обзор завершён» с иконкой успеха
- [ ] Статистика: обработано inbox задач, проектов без next action, someday задач активировано (считается на frontend в процессе wizard)
- [ ] Вызов `POST /api/review/complete` при показе экрана
- [ ] Кнопка «На главную» → navigate('/')
- [ ] Анимация появления (animate-scale-in)

**depends_on:** [L5-18, L5-19, L5-20]

**impact:** 3 | **complexity:** 2 | **risk:** 1
**priority_score:** 6.0
**Est. effort:** S (~1h)
