### L6-26 — View Transitions API wrapper

**Goal:** Добавить плавные переходы между страницами через View Transitions API с fallback.

**Input:** `frontend/src/router.tsx`.

**Output:** Утилита-обёртка для навигации с View Transitions.

**Done when:** Переходы между страницами плавные в поддерживающих браузерах, обычные в остальных.

**Acceptance criteria:**
- [ ] Утилита `navigateWithTransition(navigate, path)` — проверяет `document.startViewTransition`, использует если доступно
- [ ] Fallback: обычный `navigate(path)` для неподдерживающих браузеров
- [ ] TypeScript: тип для `startViewTransition` (или type assertion)
- [ ] Применено к основным переходам: sidebar links, кнопка «Назад» в модалках
- [ ] Не ломает навигацию в неподдерживающих браузерах (Chrome < 111, Firefox, Safari)

**depends_on:** [L6-23]

**impact:** 2 | **complexity:** 2 | **risk:** 2
**priority_score:** 3.5
**Est. effort:** S (~1h)
