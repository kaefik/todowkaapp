### L5/02 — Переписать SSE реконнект — бесконечный, с backoff, visibilitychange (BUG-4)

**Goal:** Убрать лимит в 5 попыток реконнекта SSE, добавить бесконечный реконнект с exponential backoff (cap 30s), обработку visibilitychange и navigator.onLine.

**Input:**
- Текущий код: `frontend/src/services/sseManager.ts` (249 строк)
- Текущий store: `frontend/src/stores/sseStore.ts` (если есть)

**Output:**
- Обновлённый `frontend/src/services/sseManager.ts`

**Done when:**
1. `MAX_RECONNECT_ATTEMPTS` убран — бесконечный реконнект
2. Backoff: 1s → 2s → 4s → 8s → 16s → 30s (cap)
3. Сброс delay и attempts при `BACKEND_RECOVERED` событии
4. Не пытаться реконнект при `!navigator.onLine`
5. `visibilitychange` listener: при возврате на вкладку → принудительный реконнект

**Acceptance criteria:**
- [ ] Константа `MAX_RECONNECT_ATTEMPTS` удалена
- [ ] В `scheduleReconnect()`: нет проверки лимита attempts — всегда планируется реконнект
- [ ] Backoff: `this.retryDelay = Math.min(this.retryDelay * 2, 30000)` — cap 30s
- [ ] В `scheduleReconnect()`: проверка `if (!navigator.onLine) return` — не пытаться offline
- [ ] В `connect()`: добавлен `document.addEventListener('visibilitychange', ...)` — при `document.visibilityState === 'visible'` → реконнект если не connected
- [ ] В `disconnect()`: удалён visibilitychange listener
- [ ] В обработчике `BACKEND_RECOVERED`: `this.retryDelay = 1000; this.reconnectAttempts = 0`

**depends_on:** []
**impact:** 5
**complexity:** 2
**risk:** 3
**priority_score:** 6.5
**Est. effort:** S

**LLM Prompt Hint:** "Перепиши SSE реконнект в frontend/src/services/sseManager.ts. Убери MAX_RECONNECT_ATTEMPTS — бесконечный реконнект. Backoff cap 30s. Добавь navigator.onLine check. Добавь visibilitychange listener для реконнекта при возврате на вкладку. Сброс delay при BACKEND_RECOVERED."
