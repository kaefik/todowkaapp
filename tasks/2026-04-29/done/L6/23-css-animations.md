### L6-23 — CSS анимации: keyframes + utility классы

**Goal:** Добавить набор CSS keyframes и utility классов для анимаций в проект.

**Input:** `frontend/src/index.css` (текущий — 25 строк).

**Output:** Обновлённый `index.css` с keyframes + utility + reduced motion.

**Done when:** Классы .animate-* работают в любом компоненте.

**Acceptance criteria:**
- [ ] `@keyframes fadeIn`: opacity 0→1, 200ms ease-out
- [ ] `@keyframes slideUp`: opacity 0→1, translateY(8px)→translateY(0), 200ms ease-out
- [ ] `@keyframes slideDown`: opacity 0→1, translateY(-8px)→translateY(0), 200ms ease-out
- [ ] `@keyframes scaleIn`: opacity 0→1, scale(0.95)→scale(1), 150ms ease-out
- [ ] Utility классы: `.animate-fade-in`, `.animate-slide-up`, `.animate-slide-down`, `.animate-scale-in`
- [ ] `@media (prefers-reduced-motion: reduce)`: animation-duration: 0.01ms, transition-duration: 0.01ms
- [ ] Не ломает существующие стили (pulse-ring, slideIn)

**depends_on:** []

**impact:** 3 | **complexity:** 1 | **risk:** 1
**priority_score:** 5.0
**Est. effort:** S (~1h)
