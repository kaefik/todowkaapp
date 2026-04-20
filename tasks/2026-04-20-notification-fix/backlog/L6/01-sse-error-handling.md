### L6-01 — Frontend: Improve SSE error handling and validation

**Goal:** Добавить try-catch для JSON.parse, валидацию структуры данных, логирование всех SSE событий.

**Input:** Файл `frontend/src/stores/notificationStore.ts` (существующий onMessage handler)

**Output:** Обновленный файл `frontend/src/stores/notificationStore.ts` с улучшенным error handling

**Done when:**
- onMessage имеет try-catch для JSON.parse
- Проверяется структура данных (object type validation)
- Логируются все SSE события (received, parsed, invalid, error)
- notification_data извлекается из event payload

**Acceptance criteria:**
- [ ] try-catch блок окружает JSON.parse
- [ ] Проверка `!data || typeof data !== 'object'` добавлена
- [ ] console.log для всех SSE событий с префиксом `[NotificationStore]`
- [ ] console.error для ошибок парсинга
- [ ] console.warn для неизвестных типов событий
- [ ] notification_data передается в CustomEvent.detail
- [ ] Код проходит TypeScript проверку (tsc --noEmit)

**depends_on:** []

**impact:** 5 (core feature - error handling for SSE)
**complexity:** 2 (trivial - добавить try-catch и логирование)
**risk:** 1 (safe - только добавляет logging, не меняет логику)

**priority_score:** (5 × 2 + 1) / 2 = 5.5

**Est. effort:** S (1 hour)

**LLM Prompt Hint:**
Read frontend/src/stores/notificationStore.ts, find onMessage handler in SSE connection. Add try-catch for JSON.parse, validate data structure, add logging for all events (received, parsed, error, unknown type). Extract notification_data from data.data.notification_data and pass to CustomEvent.detail. Return complete updated file.
