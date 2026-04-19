### L5/03 — Добавить polling fallback в notificationStore (BUG-5)

**Goal:** Добавить adaptive polling с backoff (30s→60s→120s) в notificationStore, который активируется при падении SSE и деактивируется при восстановлении.

**Input:**
- Текущий код: `frontend/src/stores/notificationStore.ts` (139 строк)
- Текущий API: `frontend/src/api/notifications.ts`

**Output:**
- Обновлённый `frontend/src/stores/notificationStore.ts`

**Done when:**
1. Polling запускается когда SSE в состоянии `error` или `disconnected` > 30 секунд
2. Polling interval: 30s → 60s → 120s (cap)
3. Каждый тик: `refetch({ limit: 5 })`
4. Polling останавливается при восстановлении SSE (connected)
5. Polling не запускается если пользователь не аутентифицирован

**Acceptance criteria:**
- [ ] Новые поля в store state: `pollingTimerId`, `pollingDelay`, `sseDownSince`
- [ ] Метод `_startPolling()`: устанавливает interval, вызывает `refetch({ limit: 5 })`, увеличивает delay
- [ ] Метод `_stopPolling()`: очищает timer
- [ ] В `onStateChange` callback (startSSE): при `error`/`disconnected` → запомнить время; при `connected` → `_stopPolling()`
- [ ] Таймер 30сек после ухода SSE → `_startPolling()`
- [ ] В `stopSSE()`: вызов `_stopPolling()`
- [ ] `refetch` используется из существующего API (не новый endpoint)

**depends_on:** []
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** 6.0
**Est. effort:** S

**LLM Prompt Hint:** "Добавь polling fallback в frontend/src/stores/notificationStore.ts. Когда SSE в error/disconnected > 30 сек — запускай polling: refetch({limit:5}) с интервалом 30s→60s→120s. При восстановлении SSE — останавливай polling. Не запускай polling если нет auth."
