### L7/03 — Тесты: scheduler — recovery job, max_instances, tuple unpacking

**Goal:** Написать тесты для scheduler: recovery job находит пропущенные напоминания, max_instances предотвращает дублирование, корректный tuple unpacking.

**Input:**
- Обновлённый scheduler (L2/03, L2/04, L2/05)
- Существующие тесты: `backend/tests/` (проверить наличие scheduler тестов)

**Output:**
- Новые/обновлённые тесты в `backend/tests/`

**Done when:**
Все перечисленные тесты проходят:

1. `test_reminder_recovery_after_restart` — Recovery job находит пропущенные напоминания и отправляет
2. `test_scheduler_no_parallel_ticks` — max_instances=1 предотвращает дублирование (проверить конфигурацию job)
3. `test_scheduler_tuple_unpacking` — _job_send_due_reminders корректно unpack'ает кортежи

**Acceptance criteria:**
- [ ] `test_reminder_recovery_after_restart`: создать задачу с past-due reminder, запустить recovery, проверить что notification создан
- [ ] `test_scheduler_no_parallel_ticks`: проверить что job имеет `max_instances=1` в конфигурации
- [ ] `test_scheduler_tuple_unpacking`: мокнуть find_due_tasks вернуть [(task, 5)], проверить что send_reminder вызван с offset_minutes=5
- [ ] `pytest backend/tests/ -v -k "test_reminder_recovery or test_scheduler"` — все green

**depends_on:** [L2/03, L2/04, L2/05]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S

**LLM Prompt Hint:** "Напиши тесты для scheduler в backend/tests/: test_reminder_recovery_after_restart, test_scheduler_no_parallel_ticks, test_scheduler_tuple_unpacking. Мокай find_due_tasks и send_reminder для изоляции. Проверяй что recovery job отправляет пропущенные напоминания."
