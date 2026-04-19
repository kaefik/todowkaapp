### L7/01 — Тесты: find_due_tasks — множественные offsets, timezone, return type

**Goal:** Написать тесты для переписанного `find_due_tasks()`: проверка независимой работы offsets, timezone клэмпинга, midnight edge case, унифицированного return type.

**Input:**
- Обновлённый `find_due_tasks()` (L2/01)
- Существующие тесты: `backend/tests/test_reminder_service.py` (~406 строк)
- Список тестов из дизайн-документа: строки 519-534

**Output:**
- Обновлённый `backend/tests/test_reminder_service.py`

**Done when:**
Все перечисленные тесты проходят:

1. `test_find_due_tasks_returns_tuples` — обе ветки возвращают `(Task, int | None)`
2. `test_multiple_offsets_fire_independently` — offsets=[5,60,1440], каждый срабатывает в своё время
3. `test_offset_not_fired_twice` — отправленный offset не повторяется
4. `test_reminder_time_clamping_positive_utc` — UTC+3: reminder_time > due_local.time() → клэмпинг
5. `test_reminder_time_clamping_negative_utc` — UTC-5: reminder_time > due_local.time() → клэмпинг
6. `test_reminder_time_midnight_due_date` — due_date=00:00 → клэмпинг не применяется
7. `test_dst_transition_reminder_time` — напоминание корректно в день перехода DST

**Acceptance criteria:**
- [ ] Каждый тест из списка выше существует и проходит
- [ ] Тесты используют timezone-кейсы: Europe/Moscow (+3), America/New_York (-5/-4), Asia/Tokyo (+9), UTC, Pacific/Honolulu (-10)
- [ ] Существующие тесты не сломаны (обновлены под новый return type)
- [ ] `pytest backend/tests/test_reminder_service.py -v` — все тесты green

**depends_on:** [L2/01]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S

**LLM Prompt Hint:** "Напиши тесты для find_due_tasks в backend/tests/test_reminder_service.py. Обнови существующие тесты под новый return type list[tuple[Task, int | None]]. Добавь новые тесты: test_find_due_tasks_returns_tuples, test_multiple_offsets_fire_independently, test_offset_not_fired_twice, test_reminder_time_clamping_positive_utc, test_reminder_time_clamping_negative_utc, test_reminder_time_midnight_due_date, test_dst_transition_reminder_time. Используй pytest-asyncio."
