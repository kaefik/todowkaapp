### L3-06 — Адаптировать NotificationProvider — убрать useQueryClient

**Goal:** Заменить `queryClient.invalidateQueries({ queryKey: taskKeys.all })` на Dexie-совместимый подход.
**Input:** Завершённый L3-02. Текущий `frontend/src/components/NotificationProvider.tsx`.
**Output:** Обновлённый `frontend/src/components/NotificationProvider.tsx`.
**Done when:** Provider не импортирует `useQueryClient` и `taskKeys`. TypeScript компилируется.
**Acceptance criteria:**
- [ ] Убран import `useQueryClient` из `@tanstack/react-query`
- [ ] Убран import `taskKeys` из `useTasks`
- [ ] Убран `const queryClient = useQueryClient()`
- [ ] `queryClient.invalidateQueries({ queryKey: taskKeys.all })` в обработчике `task:reminder-fired` убран
- [ ] useLiveQuery в хуках обновится автоматически при изменении Dexie (ничего не нужно вызывать)
- [ ] Остальная логика (SSE, browser notifications, toasts) сохранена
**depends_on:** [L3/02]
**impact:** 4
**complexity:** 2
**risk:** 2
**priority_score:** 5.0
**Est. effort:** S
