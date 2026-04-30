### L5-17 — Frontend: Review wizard route + layout

**Goal:** Создать маршрут /review с полноэкранным wizard layout (как Onboarding).

**Input:** Review API (L3-09). Onboarding wizard как паттерн. `frontend/src/router.tsx`.

**Output:**
- `frontend/src/routes/Review.tsx` — страница-контейнер
- `frontend/src/components/review/ReviewWizard.tsx` — wrapper с progress bar
- Обновлённый `router.tsx` с маршрутом /review

**Done when:** /review открывается, показывает wizard с 3 шагами (пока пустыми), progress bar работает.

**Acceptance criteria:**
- [ ] Маршрут `/review` в router.tsx, защищённый (требует авторизацию)
- [ ] Review.tsx: полноэкранный layout без sidebar. Фон gradient или card layout как Onboarding.
- [ ] ReviewWizard.tsx: progress bar (3 точки/шага), навигация Назад/Далее, state machine шагов через `useState`
- [ ] Шаги: 0=ReviewInbox, 1=ReviewProjects, 2=ReviewSomeday, 3=Completion
- [ ] При mount: `GET /api/review/status` загрузка данных
- [ ] Loading state пока данные загружаются
- [ ] Кнопка «Отмена» → редирект на `/`
- [ ] i18n ключи для ru/en

**depends_on:** [L3-09]

**impact:** 4 | **complexity:** 2 | **risk:** 1
**priority_score:** 7.0
**Est. effort:** S (~1h)
