### L3-18 — Создать SyncStatus UI компонент

**Goal:** Создать визуальный индикатор статуса синхронизации (online/offline/syncing/pending count).
**Input:** Завершённый L3-08 (SyncContext).
**Output:** Файл `frontend/src/components/SyncStatus.tsx`.
**Done when:** Компонент показывает текущий статус синхронизации.
**Acceptance criteria:**
- [ ] Использует `useSyncStatus()` из SyncProvider
- [ ] Показывает: online/offline, syncing spinner, pending mutations count
- [ ] Tailwind стили, тёмная тема
- [ ] Компактный дизайн для header/sidebar
**depends_on:** [L3/08]
**impact:** 3
**complexity:** 2
**risk:** 1
**priority_score:** 3.5
**Est. effort:** S
