### L8-06 — Обновить docs/features.md

**Goal:** Задокументировать новую функциональность local-first офлайн-режима.
**Input:** Завершённые все задачи.
**Output:** Обновлённый `docs/features.md`.
**Done when:** Добавлена секция "Local-first офлайн-режим на Dexie.js" с описанием всех возможностей.
**Acceptance criteria:**
- [ ] Добавлена секция "Local-first офлайн-режим"
- [ ] Описаны: Dexie.js как локальная БД, full offline CRUD, SyncEngine, LWW conflict resolution, soft-delete
- [ ] Перечислены новые файлы: `frontend/src/db/database.ts`, `syncEngine.ts`, `conflictResolution.ts`, `mappers.ts`, `hooks.ts`, `init.ts`, `migration.ts`
- [ ] Перечислены новые компоненты: `SyncProvider.tsx`, `SyncStatus.tsx`
- [ ] Указано: React Query удалён, httpClient упрощён
- [ ] Следует формату документирования из `docs/features.md`
**depends_on:** [L8/05]
**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** S
**type:** DOCS
