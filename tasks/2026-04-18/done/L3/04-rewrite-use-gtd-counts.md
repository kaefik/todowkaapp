### L3-04 — Переписать useGtdCounts на useLiveQuery

**Goal:** Вычислять счётчики GTD-статусов из Dexie вместо API-запроса.
**Input:** Завершённые L1-01, L3-01. Текущий `frontend/src/hooks/useGtdCounts.ts`.
**Output:** Переписанный `frontend/src/hooks/useGtdCounts.ts`.
**Done when:** Счётчики обновляются реактивно при изменении задач в Dexie.
**Acceptance criteria:**
- [ ] `useGtdCounts()` использует `useLiveQuery` для подсчёта задач по каждому статусу
- [ ] Для каждого статуса: `db.tasks.where('[userId+gtdStatus]').equals([uid, status]).filter(t => t._syncStatus !== 'deleted').count()`
- [ ] Возвращает тот же интерфейс `{ counts: GtdCounts, isLoading, error, refetch }`
- [ ] `refetch` — no-op (useLiveQuery реактивный)
- [ ] `notifyTasksChanged()` и event listener убраны (больше не нужны)
- [ ] `GTD_STATUS_LABELS` остаётся без изменений
**depends_on:** [L1/01, L3/01]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S
