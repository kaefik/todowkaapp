### L2/06 — Сброс полей дедупликации + guard внутренних полей в `update_task()` (BUG-1b, BUG-1c guard)

**Goal:** При обновлении reminder-полей сбрасывать оба поля дедупликации и добавить defensive guard против записи внутренних полей через API.

**Input:**
- Текущий код: `backend/app/services/task_service.py:154-181` (метод update_task)
- Новая колонка `sent_reminder_offsets` (L1/01)

**Output:**
- Обновлённый `backend/app/services/task_service.py` — метод `update_task()`

**Done when:**
1. При обновлении `reminder_time` или `reminder_offsets`: сбрасываются `reminder_fired`, `sent_reminder_offsets`, `last_reminder_sent_at`
2. Defensive guard удаляет внутренние поля (`reminder_fired`, `last_reminder_sent_at`, `sent_reminder_offsets`) из `update_data` перед обработкой

**Acceptance criteria:**
- [ ] Guard в начале метода (после `update_data = data.model_dump(exclude_unset=True)`):
  ```python
  INTERNAL_FIELDS = {'reminder_fired', 'last_reminder_sent_at', 'sent_reminder_offsets'}
  for field in INTERNAL_FIELDS:
      update_data.pop(field, None)
  ```
- [ ] Расширенный сброс dedup-полей:
  ```python
  if 'reminder_time' in update_data or 'reminder_offsets' in update_data:
      update_data['reminder_fired'] = False
      update_data['sent_reminder_offsets'] = []
      update_data['last_reminder_sent_at'] = None
  ```

**depends_on:** [L1/01]
**impact:** 4
**complexity:** 1
**risk:** 2
**priority_score:** 10.0
**Est. effort:** XS

**LLM Prompt Hint:** "Обнови метод update_task в backend/app/services/task_service.py. 1) Добавь defensive guard: удаляй reminder_fired, last_reminder_sent_at, sent_reminder_offsets из update_data. 2) При обновлении reminder-полей сбрасывай все три: reminder_fired=False, sent_reminder_offsets=[], last_reminder_sent_at=None."
