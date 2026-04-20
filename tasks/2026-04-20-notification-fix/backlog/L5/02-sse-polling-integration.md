### L5-02 — Frontend: Integrate SSE manager with polling fallback

**Goal:** Добавить автоматическое переключение SSE ↔ polling в SSE manager.

**Input:** Файл `frontend/src/services/sseManager.ts` (существующий SSE manager)

**Output:** Обновленный файл `frontend/src/services/sseManager.ts` с polling fallback интеграцией

**Done when:**
- onError запускает polling fallback если не запущен
- onOpen останавливает polling fallback если запущен
- SSE connection state обновляется корректно
- Все действия логируются с префиксом `[SSE]`

**Acceptance criteria:**
- [ ] onError handler проверяет store.pollingInterval
- [ ] onError вызывает store.startPolling() если polling не запущен
- [ ] onOpen проверяет store.pollingInterval
- [ ] onOpen вызывает store.stopPolling() если polling запущен
- [ ] Логирование всех переключений (SSE → polling, polling → SSE)
- [ ] SSE state обновляется (error/connected)
- [ ] Код проходит TypeScript проверку

**depends_on:** [L5-01]

**impact:** 4 (high - обеспечивает автоматическое восстановление SSE)
**complexity:** 2 (trivial - добавить логику в existing handlers)
**risk:** 2 (safe - только добавляет polling integration)

**priority_score:** (4 × 2 + 2) / 2 = 5.0

**Est. effort:** S (1 hour)

**LLM Prompt Hint:**
Read frontend/src/services/sseManager.ts. In onError handler: log error, get store from window.useNotificationStore.getState(), if store exists and !store.pollingInterval, log "Starting polling fallback", call store.startPolling(), set sseState to 'error'. In onOpen handler: log connection opened, get store, if store exists and store.pollingInterval, log "SSE restored, stopping polling", call store.stopPolling(), set sseState to 'connected'. Return complete updated file.
