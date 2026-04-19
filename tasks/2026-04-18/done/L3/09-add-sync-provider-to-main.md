### L3-09 — Добавить SyncProvider в main.tsx

**Goal:** Интегрировать SyncProvider в дерево компонентов.
**Input:** Завершённый L3-08. Текущий `frontend/src/main.tsx`.
**Output:** Обновлённый `frontend/src/main.tsx`.
**Done when:** SyncProvider обёрнут вокруг AppRouter внутри AuthInitializer. TypeScript компилируется.
**Acceptance criteria:**
- [ ] `SyncProvider` импортирован из `./components/SyncProvider`
- [ ] SyncProvider обёрнут внутри `AuthInitializer`, снаружи `NotificationProvider`
- [ ] Порядок: `QueryClientProvider` > `OfflineBanner` > `AuthInitializer` > `SyncProvider` > `NotificationProvider` > `AppRouter`
- [ ] Сборка без ошибок
**depends_on:** [L3/08]
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** 11.0
**Est. effort:** XS
