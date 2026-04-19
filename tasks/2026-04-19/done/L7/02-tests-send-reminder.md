### L7/02 — Тесты: send_reminder — offset writes, conditional fired, last_sent

**Goal:** Написать тесты для обновлённого `send_reminder()`: запись offset в sent_reminder_offsets, условная установка reminder_fired, обновление last_reminder_sent_at.

**Input:**
- Обновлённый `send_reminder()` (L2/02)
- Существующие тесты: `backend/tests/test_reminder_service.py`

**Output:**
- Обновлённый `backend/tests/test_reminder_service.py`

**Done when:**
Все перечисленные тесты проходят:

1. `test_send_reminder_offset_writes_to_sent_array` — send_reminder с offset записывает в sent_reminder_offsets
2. `test_send_reminder_offset_conditional_fired` — reminder_fired=True только когда ВСЕ offsets отправлены
3. `test_send_reminder_time_sets_last_sent` — reminder_time режим обновляет last_reminder_sent_at

**Acceptance criteria:**
- [ ] Каждый тест из списка существует и проходит
- [ ] `test_send_reminder_offset_writes_to_sent_array`: создать задачу с offsets=[5,60], отправить offset=5, проверить `task.sent_reminder_offsets == [5]` и `task.reminder_fired == False`
- [ ] `test_send_reminder_offset_conditional_fired`: отправить все offsets, проверить `task.reminder_fired == True`
- [ ] `test_send_reminder_time_sets_last_sent`: отправить с offset_minutes=None, проверить `task.last_reminder_sent_at is not None`
- [ ] `pytest backend/tests/test_reminder_service.py -v` — все green

**depends_on:** [L2/02]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S

**LLM Prompt Hint:** "Напиши тесты для send_reminder в backend/tests/test_reminder_service.py: test_send_reminder_offset_writes_to_sent_array, test_send_reminder_offset_conditional_fired, test_send_reminder_time_sets_last_sent. Используй pytest-asyncio, фикстуры db_session из conftest."
