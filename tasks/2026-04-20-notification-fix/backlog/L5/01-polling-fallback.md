### L5-01 — Frontend: Add polling fallback to notification store

**Goal:** Реализовать startPolling/stopPolling методы в notification store для SSE fallback.

**Input:** Файл `frontend/src/stores/notificationStore.ts` (существующий store)

**Output:** Обновленный файл `frontend/src/stores/notificationStore.ts` с polling fallback

**Done when:**
- Interface включает pollingInterval: number | null
- Interface включает startPolling() и stopPolling() методы
- initialState включает pollingInterval: null
- startPolling вызывает refetch() и запускает setInterval (30 сек)
- stopPolling очищает interval
- cleanup вызывает stopPolling()
- Все методы логируются с префиксом `[NotificationStore]`

**Acceptance criteria:**
- [ ] pollingInterval добавлен в interface
- [ ] startPolling() реализован с logging
- [ ] stopPolling() реализован с logging
- [ ] setInterval настроен на 30000ms
- [ ] cleanup() вызывает stopPolling()
- [ ] Код проходит TypeScript проверку
- [ ] Нет утечек памяти (interval очищается)

**depends_on:** []

**impact:** 4 (high - обеспечивает отказоустойчивость SSE)
**complexity:** 2 (trivial - добавить 2 метода и поле)
**risk:** 2 (safe - не ломает существующую логику)

**priority_score:** (4 × 2 + 2) / 2 = 5.0

**Est. effort:** S (1 hour)

**LLM Prompt Hint:**
Read frontend/src/stores/notificationStore.ts. Add to interface: pollingInterval: number | null, startPolling(): void, stopPolling(): void. Add to initialState: pollingInterval: null. Implement startPolling: log start, call refetch(), start setInterval for 30000ms calling refetch(). Implement stopPolling: log stop, clear interval, set pollingInterval to null. Update cleanup to call stopPolling(). Return complete updated file.
