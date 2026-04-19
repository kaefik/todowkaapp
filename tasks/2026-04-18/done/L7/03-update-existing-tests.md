### L7-03 — Обновить существующие тесты — заменить RQ mocks на Dexie mocks

**Goal:** Обновить все тесты, которые мокают React Query, на работу с Dexie.
**Input:** Завершённые все L3 задачи. Существующие тесты `frontend/src/**/*.test.{ts,tsx}`.
**Output:** Обновлённые тестовые файлы.
**Done when:** `vitest run` проходит без ошибок. Нет import из `@tanstack/react-query` в тестах.
**Acceptance criteria:**
- [ ] Все тесты, использующие `useQuery`, `useMutation`, `QueryClientProvider` переписаны
- [ ] Dexie мокается через `vi.mock('dexie-react-hooks')` или in-memory fake Dexie
- [ ] Тесты `Tasks.test.tsx`, `Subtasks.test.tsx`, `Projects.test.tsx`, `TaskEditModal.test.tsx` обновлены
- [ ] `vitest run` — все тесты проходят
- [ ] Нет failed/pending тестов
**depends_on:** [L3/02, L3/05, L3/14]
**impact:** 4
**complexity:** 3
**risk:** 3
**priority_score:** 3.67
**Est. effort:** M
