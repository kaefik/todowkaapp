### L3-10 — Обновить Service Worker — убрать api-cache для /api/*

**Goal:** Убрать Workbox runtime caching для API-запросов, так как Dexie заменяет кэширование.
**Input:** Текущий `frontend/vite.config.ts`.
**Output:** Обновлённый `frontend/vite.config.ts`.
**Done when:** Service Worker не кэширует `/api/*` запросы. Статика и offline.html кэшируются.
**Acceptance criteria:**
- [ ] Убран `runtimeCaching` entry для `urlPattern: /^\/api\/.*/`
- [ ] Оставлен `runtimeCaching` для изображений (CacheFirst)
- [ ] Оставлен `globPatterns` для статики
- [ ] Оставлен `includeAssets` с offline.html
- [ ] `npm run build` собирается без ошибок
**depends_on:** []
**impact:** 3
**complexity:** 1
**risk:** 2
**priority_score:** 8.0
**Est. effort:** XS
