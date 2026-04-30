### L6-24 — Modal animations

**Goal:** Добавить анимации появления к существующим модальным окнам.

**Input:** CSS utilities (L6-23). Существующие модалки: TaskDetailModal, TaskEditModal, ConfirmDialog, DeleteAccountModal и др.

**Output:** Обновлённые модалки с animate-scale-in на content и animate-fade-in на overlay.

**Done when:** Модалки плавно появляются и исчезают.

**Acceptance criteria:**
- [ ] Overlay (backdrop): класс `animate-fade-in`
- [ ] Modal content: класс `animate-scale-in`
- [ ] Применено ко всем модалкам в проекте (найти через grep по "modal" или "Modal" в компонентах)
- [ ] Закрытие: CSS transition opacity→0 + scale(0.95) — если mount/unmount анимация невозможна через CSS-only, добавить минимальный state-based подход
- [ ] Reduced motion: модалки появляются мгновенно при prefers-reduced-motion

**depends_on:** [L6-23]

**impact:** 3 | **complexity:** 2 | **risk:** 1
**priority_score:** 4.5
**Est. effort:** S (~1h)
