### L3-16 — Проверить интеграцию TaskEditModal + TaskFilterPanel

**Goal:** Убедиться что TaskEditModal и TaskFilterPanel работают с переписанными хуками без ошибок.
**Input:** Завершённые L3-02..14. Компоненты `TaskEditModal.tsx`, `TaskFilterPanel.tsx`.
**Output:** При необходимости — мелкие фиксы в компонентах.
**Done when:** `npm run build` без ошибок. TaskEditModal открывается, показывает tags/projects/contexts. TaskFilterPanel фильтрует задачи.
**Acceptance criteria:**
- [ ] `npm run build` собирается без ошибок
- [ ] TaskEditModal корректно вызывает `updateTask` из нового useTasks
- [ ] TaskFilterPanel получает tags/contexts/areas/projects из новых хуков
- [ ] Нет import из `@tanstack/react-query` в этих компонентах (если были)
- [ ] Нет TypeScript ошибок
**depends_on:** [L3/02, L3/11, L3/12, L3/13, L3/14]
**impact:** 3
**complexity:** 2
**risk:** 2
**priority_score:** 4.0
**Est. effort:** S
