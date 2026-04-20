### L1-01 — Backend: Add notification_data to SSE event payload

**Goal:** Модифицировать event_bus для отправки полных данных уведомления в SSE payload.

**Input:** Файл `backend/app/event_bus.py` (существующий код publish_reminder)

**Output:** Обновленный файл `backend/app/event_bus.py` с добавлением notification_data в payload

**Done when:**
- Функция publish_reminder добавляет notification_data в SSE payload
- payload содержит: id, message, created_at, due_date
- Логирование события включает notification.id

**Acceptance criteria:**
- [ ] SSE event payload содержит notification_data object
- [ ] notification_data включает все необходимые поля (id, message, created_at, due_date)
- [ ] logger.info включает notification.id
- [ ] Код проходит Python linting (ruff check)

**depends_on:** []

**impact:** 5 (core feature - foundation for frontend fix)
**complexity:** 2 (trivial - добавить несколько полей в payload)
**risk:** 2 (safe - backwards compatible, не ломает существующие consumers)

**priority_score:** (5 × 2 + 2) / 2 = 6.0

**Est. effort:** S (1 hour)

**LLM Prompt Hint:**
Read backend/app/event_bus.py, find publish_reminder function, add notification_data field to the payload with: id, message, created_at (isoformat), due_date (isoformat if exists). Add logger.info with notification.id. Return complete updated file.
