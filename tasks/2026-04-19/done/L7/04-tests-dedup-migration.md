### L7/04 — Тесты: сброс dedup полей, миграция sent_reminder_offsets

**Goal:** Написать тесты для сброса полей дедупликации в update_task и корректности миграции.

**Input:**
- Обновлённый task_service (L2/06)
- Миграция (L1/01)

**Output:**
- Новые тесты в `backend/tests/`

**Done when:**
Все перечисленные тесты проходят:

1. `test_update_task_resets_dedup_fields` — при обновлении reminder-полей сбрасываются оба поля дедупликации
2. `test_sent_reminder_offsets_migration` — миграция корректно инициализирует пустые массивы

**Acceptance criteria:**
- [ ] `test_update_task_resets_dedup_fields`: создать задачу с sent_reminder_offsets=[5,60] и last_reminder_sent_at, обновить reminder_time, проверить что оба поля сброшены
- [ ] `test_sent_reminder_offsets_migration`: проверить что колонка sent_reminder_offsets существует и default=[]
- [ ] `pytest backend/tests/ -v -k "test_update_task_resets_dedup or test_sent_reminder_offsets_migration"` — green

**depends_on:** [L2/06, L1/01]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS

**LLM Prompt Hint:** "Напиши тесты: test_update_task_resets_dedup_fields (при обновлении reminder полей сбрасываются sent_reminder_offsets и last_reminder_sent_at) и test_sent_reminder_offsets_migration (миграция создаёт колонку с default []). В backend/tests/."
