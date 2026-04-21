### L6-06 — Исключить /api/auth/* из Workbox кеширования

**Goal:** Предотвратить кеширование POST-запросов к `/api/auth/*` PWA service worker, чтобы cookie всегда устанавливался корректно.

**Input:** `frontend/vite.config.ts` (строки 11–57: VitePWA конфигурация)

**Output:** Обновлённый `frontend/vite.config.ts` с `navigateFallbackDenylist: [/^\/api/]`.

**Done when:** Service worker не перехватывает запросы к `/api/auth/*`.

**Acceptance criteria:**
- [ ] В VitePWA конфигурацию добавлен `navigateFallbackDenylist: [/^\/api/]`
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run lint` без ошибок

**depends_on:** []

**impact:** 3
**complexity:** 1
**risk:** 2
**priority_score:** 8.0
**Est. effort:** XS

**LLM Prompt Hint:** В vite.config.ts в VitePWA конфигурацию добавь navigateFallbackDenylist: [/^\/api/] чтобы SW не кешировал API запросы.
