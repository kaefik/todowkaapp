### L5/01 — Исправить EventBus — размер очереди 10→50, overflow→refetch сигнал (BUG-6 backend)

**Goal:** Увеличить размер очереди EventBus с 10 до 50 и при переполнении отправлять сигнал `queue_overflow` вместо простого drop.

**Input:**
- Текущий код: `backend/app/event_bus.py` (весь файл, 48 строк)

**Output:**
- Обновлённый `backend/app/event_bus.py`

**Done when:**
1. Размер очереди: `maxsize=50` (вместо 10)
2. При `QueueFull`: заменить старейшее событие на `{"type": "queue_overflow", "data": {}}`

**Acceptance criteria:**
- [ ] `asyncio.Queue(maxsize=50)` в методе `subscribe()`
- [ ] В методе `publish()`: при `QueueFull` вместо `logger.warning + drop` — получить старейшее событие через `queue.get_nowait()` и положить `{"type": "queue_overflow", "data": {}}` через `queue.put_nowait()`
- [ ] Обернуть операции с очередью в try/except на случай race condition

**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 2
**priority_score:** 10.0
**Est. effort:** XS

**LLM Prompt Hint:** "Обнови backend/app/event_bus.py: 1) Измени maxsize с 10 на 50. 2) При QueueFull в publish(): получи старейшее событие queue.get_nowait() и замени на queue.put_nowait({'type': 'queue_overflow', 'data': {}}). Добавь try/except вокруг операций."
