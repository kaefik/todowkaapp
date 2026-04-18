### L3-01 — Создать db/hooks.ts (useDexieQuery, useOnlineStatus)

**Goal:** Создать React-хуки для работы с Dexie и определения online-статуса.
**Input:** Завершённый L1-01, установленный `dexie-react-hooks` (L0-01).
**Output:** Файл `frontend/src/db/hooks.ts` с хуками `useDexieQuery` и `useOnlineStatus`.
**Done when:** Файл создан, TypeScript компилируется.
**Acceptance criteria:**
- [ ] `useDexieQuery<T>(querier, deps?)` оборачивает `useLiveQuery` и возвращает `{ data: T | undefined, isLoading: boolean }`
- [ ] `isLoading` = `true` пока `data === undefined`, становится `false` после первого значения
- [ ] `useOnlineStatus()` возвращает `boolean`, подписан на `window.addEventListener('online'/'offline')`
- [ ] Clean-up listeners при unmount
**depends_on:** [L1/01]
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** 11.0
**Est. effort:** XS
