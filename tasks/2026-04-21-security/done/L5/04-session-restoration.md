### L5-04 — Восстановление сессии при загрузке и синхронизация logout между вкладками

**Goal:** При загрузке приложения — если `isAuthenticated: true` в Zustand persist — проверить сессию через `/api/auth/me` (cookie). При logout в одной вкладке — очистить state в других.

**Input:**
- `frontend/src/stores/authStore.ts`
- Место где вызывается `fetchCurrentUser` при загрузке приложения

**Output:** Обновлённый `frontend/src/stores/authStore.ts` с session restoration + cross-tab logout sync.

**Done when:** При загрузке с `isAuthenticated: true` — вызывается `fetchCurrentUser` через cookie. При 401 — state очищается, redirect на login. При logout в вкладке A — вкладка B очищается.

**Acceptance criteria:**
- [ ] Найдено место вызова `fetchCurrentUser` при загрузке (App.tsx или другой компонент)
- [ ] Логика: `isAuthenticated: true` → `fetchCurrentUser()` → если 401 → очистить state + redirect `/login`
- [ ] Если `fetchCurrentUser` успех → обновить user data
- [ ] Добавлен `storage` event listener: при изменении `auth-storage` в другой вкладке — если `isAuthenticated` стал `false` — очистить state в текущей вкладке
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run lint` без ошибок

**depends_on:** [L5-03]

**impact:** 4
**complexity:** 2
**risk:** 3
**priority_score:** 5.5
**Est. effort:** S

**LLM Prompt Hint:** Найди где вызывается fetchCurrentUser при загрузке. Убедись что при isAuthenticated:true вызывается fetchCurrentUser (cookie). При 401 — очистить state + redirect. Добавь storage event listener для синхронизации logout между вкладками.
