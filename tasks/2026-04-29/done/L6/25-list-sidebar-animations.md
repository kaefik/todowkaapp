### L6-25 — List + sidebar animations

**Goal:** Добавить анимации для элементов списка и sidebar toggle.

**Input:** CSS utilities (L6-23).

**Output:** Обновлённые списки задач + sidebar toggle с анимациями.

**Done when:** Задачи в списках появляются со stagger, sidebar плавно сворачивается.

**Acceptance criteria:**
- [ ] Элементы списка задач: `animate-slide-up` при mount
- [ ] Stagger через inline `animation-delay: ${index * 30}ms` (макс 300ms total)
- [ ] Новая задача вверху списка: `animate-slide-down`
- [ ] Sidebar toggle: `transition: width 200ms ease` на контейнер sidebar
- [ ] Sidebar overlay (mobile): `animate-fade-in` при появлении
- [ ] Reduced motion: всё мгновенное

**depends_on:** [L6-23]

**impact:** 2 | **complexity:** 2 | **risk:** 2
**priority_score:** 4.0
**Est. effort:** S (~1h)
