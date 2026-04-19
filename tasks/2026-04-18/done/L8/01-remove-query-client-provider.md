### L8-01 — Убрать QueryClientProvider + ReactQueryDevtools из main.tsx

**Goal:** Удалить React Query provider из дерева компонентов, так как все хуки переписаны.
**Input:** Завершённые все L3 задачи (ни один хук не использует RQ). Текущий `frontend/src/main.tsx`.
**Output:** Обновлённый `frontend/src/main.tsx` без RQ.
**Done when:** `npm run build` без ошибок. Нет import из `@tanstack/react-query`.
**Acceptance criteria:**
- [ ] Убран import `QueryClientProvider` из `@tanstack/react-query`
- [ ] Убран import `ReactQueryDevtools` из `@tanstack/react-query-devtools`
- [ ] Убран import `queryClient` из `./lib/queryClient`
- [ ] `<QueryClientProvider>` wrapper убран
- [ ] `<ReactQueryDevtools>` убран
- [ ] `npm run build` проходит
**depends_on:** [L3/02, L3/11, L3/12, L3/13, L3/14, L3/17]
**impact:** 3
**complexity:** 1
**risk:** 2
**priority_score:** 8.0
**Est. effort:** XS
