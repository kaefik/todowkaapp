### L5/04 — Обработка `queue_overflow` события в frontend (BUG-6 frontend)

**Goal:** При получении `queue_overflow` события через SSE — выполнить `refetch()` для загрузки всех уведомлений заново.

**Input:**
- Обновлённый EventBus (L5/01) — отправляет `queue_overflow` при переполнении
- Обновлённый notificationStore (L5/03) — polling fallback
- Текущий SSE handler: `frontend/src/stores/notificationStore.ts:109-122`

**Output:**
- Обновлённый `frontend/src/stores/notificationStore.ts` — обработка `queue_overflow` в `onMessage`

**Done when:**
1. При получении SSE-события с `type === 'queue_overflow'` вызывается `refetch()`

**Acceptance criteria:**
- [ ] В `onMessage` callback (startSSE): проверка `if (data?.type === 'queue_overflow')` → `get().refetch()`
- [ ] Парсинг JSON из `message.data` обрабатывает вложенную структуру

**depends_on:** [L5/01, L5/03]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS

**LLM Prompt Hint:** "В onMessage callback в notificationStore (frontend/src/stores/notificationStore.ts), добавь обработку queue_overflow: если data.type === 'queue_overflow' — вызвать refetch()."
