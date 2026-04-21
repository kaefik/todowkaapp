### L5-01 — Обновить sseManager.ts — убрать token из URL

**Goal:** Убрать передачу токена через query parameter `?token=` в SSE URL. Cookie отправляются автоматически через `withCredentials: true`.

**Input:** `frontend/src/services/sseManager.ts` (строки 35, 37–42, 84–100)

**Output:** Обновлённый `frontend/src/services/sseManager.ts` без поля `token` и query param в URL.

**Done when:** SSE подключение к `/api/sse/notifications` без `?token=`. Cookie отправляется. `npx tsc --noEmit` без ошибок.

**Acceptance criteria:**
- [ ] Поле `token: string | null = null` удалено из класса
- [ ] Параметр `token?` удалён из метода `connect()`
- [ ] Блок `if (this.token) { sseUrl = ... }` удалён (строки 97–99)
- [ ] DEV-специальный URL `http://127.0.0.1:8000/...` заменён на относительный `/api/sse/notifications`
- [ ] SSE URL всегда относительный: `/api/sse/notifications` (проксируется через Vite)
- [ ] `withCredentials: true` остаётся (строка 107)
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run lint` без ошибок

**depends_on:** [L4-03]

**impact:** 4
**complexity:** 2
**risk:** 3
**priority_score:** 5.5
**Est. effort:** S

**LLM Prompt Hint:** В sseManager.ts убери поле token, параметр token из connect(), блок с ?token= в URL. Замени DEV URL на относительный /api/sse/notifications. withCredentials: true остаётся.
