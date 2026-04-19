### L3-17 — Переписать useRecurrences (оставить httpClient, серверная логика)

**Goal:** Убрать React Query из useRecurrences, заменив на прямые httpClient вызовы. Recurrences — серверная логика, не хранится локально.
**Input:** Текущий `frontend/src/hooks/useRecurrences.ts`.
**Output:** Обновлённый `frontend/src/hooks/useRecurrences.ts` без React Query.
**Done when:** Хук работает без RQ, использует useState + httpClient.
**Acceptance criteria:**
- [ ] Убраны imports `useQuery`, `useMutation`, `useQueryClient` из `@tanstack/react-query`
- [ ] Остаётся на `httpClient` (recurrences не хранятся локально)
- [ ] `fetchRecurrences()` — httpClient.get
- [ ] `stopRecurrence()` — httpClient.post
- [ ] Тот же return интерфейс
- [ ] TypeScript компилируется
**depends_on:** []
**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS
