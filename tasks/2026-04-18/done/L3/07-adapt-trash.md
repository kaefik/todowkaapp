### L3-07 — Адаптировать Trash.tsx — убрать useQueryClient, использовать Dexie soft-delete

**Goal:** Переписать очистку корзины на Dexie-операцию вместо HTTP-запроса + RQ invalidate.
**Input:** Завершённый L3-02, L3-04. Текущий `frontend/src/routes/Trash.tsx`.
**Output:** Обновлённый `frontend/src/routes/Trash.tsx`.
**Done when:** Очистка корзины работает через Dexie без HTTP-запроса и React Query.
**Acceptance criteria:**
- [ ] Убран import `useQueryClient` из `@tanstack/react-query`
- [ ] Убран import `taskKeys` из `useTasks`
- [ ] Убран import `httpClient` и `ApiError`
- [ ] `handleClearTrash` использует Dexie: `db.tasks.where('userId').equals(uid).filter(t => t.gtdStatus === 'trash' && t._syncStatus !== 'deleted').modify({ _syncStatus: 'deleted', updatedAt: new Date().toISOString() })`
- [ ] Для каждой удалённой задачи создаётся мутация `{action: 'delete', entityType: 'task'}` в `db.mutations`
- [ ] `notifyTasksChanged()` убран (useLiveQuery обновится автоматически)
- [ ] `useGtdCounts` продолжает работать для `isEmpty` проверки
**depends_on:** [L3/02, L3/04]
**impact:** 3
**complexity:** 2
**risk:** 2
**priority_score:** 4.0
**Est. effort:** S
