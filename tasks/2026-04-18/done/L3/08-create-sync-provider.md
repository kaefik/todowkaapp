### L3-08 — Создать SyncProvider.tsx (оркестратор синхронизации)

**Goal:** Создать React-компонент-обёртку, запускающий SyncEngine (periodic pull, push on online).
**Input:** Завершённый L2-03. `frontend/src/db/hooks.ts` (useOnlineStatus).
**Output:** Файл `frontend/src/components/SyncProvider.tsx` с context и provider.
**Done when:** Provider монтируется, запускает periodic pull каждые 15 мин, push при online, предоставляет sync status через context.
**Acceptance criteria:**
- [ ] `SyncProvider` оборачивает children
- [ ] При mount: запускает `push()` (если есть pending мутации)
- [ ] Periodic pull: setInterval 15 минут → `pull(userId)`
- [ ] On online event: `push()` + `pull()`
- [ ] При unmount: очищает таймеры
- [ ] Экспортирует `SyncContext` с полями: `isSyncing`, `pendingCount`, `lastSyncAt`, `isOnline`
- [ ] Экспортирует `useSyncStatus()` hook для доступа к context
- [ ] Запускается только для authenticated пользователей (проверяет userId)
**depends_on:** [L2/03, L3/01]
**impact:** 5
**complexity:** 3
**risk:** 3
**priority_score:** 4.33
**Est. effort:** M
