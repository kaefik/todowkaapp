### L5-02 — Обновить httpClient.ts — credentials + убрать Authorization header

**Goal:** Добавить `credentials: 'include'` для отправки httpOnly cookies. Удалить чтение токена из localStorage и установку Authorization header.

**Input:** `frontend/src/api/httpClient.ts` (строки 42–53: извлечение токена, Authorization header, fetch без credentials)

**Output:** Обновлённый `frontend/src/api/httpClient.ts` — fetch с `credentials: 'include'`, без Authorization header.

**Done when:** Все API-запросы отправляют cookie (credentials: include). Нет чтения из localStorage. `npx tsc --noEmit` без ошибок.

**Acceptance criteria:**
- [ ] В `fetchWithAuth`: добавлен `credentials: 'include'` в параметры fetch
- [ ] Удалено чтение `authStore.accessToken` и `localStorage.getItem('accessToken')`
- [ ] Удалена установка `headers['Authorization'] = 'Bearer ${token}'`
- [ ] Параметр `skipAuth` удалён (если есть) — больше не нужен
- [ ] Импорт `useAuthStore` удалён если больше не используется
- [ ] 401-обработка (refresh logic) сохранена — но refresh тоже идёт через cookie
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run lint` без ошибок

**depends_on:** [L3-02]

**impact:** 5
**complexity:** 2
**risk:** 4
**priority_score:** 7.0
**Est. effort:** S

**LLM Prompt Hint:** В httpClient.ts добавь credentials: 'include' в fetch, удали чтение accessToken из authStore/localStorage и установку Authorization header. Параметр skipAuth удали. Сохрани 401-обработку с refresh.
