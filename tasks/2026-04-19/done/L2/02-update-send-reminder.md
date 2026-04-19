### L2/02 — Обновить `send_reminder()` — параметр offset_minutes, условный reminder_fired (BUG-1, BUG-8)

**Goal:** Обновить `send_reminder()` для записи отправленного offset в `sent_reminder_offsets` и условной установки `reminder_fired`.

**Input:**
- Текущий код: `backend/app/services/reminder_service.py:83-102`
- Новая колонка `sent_reminder_offsets` (L1/01)
- Полный код из дизайн-документа: строки 113-146

**Output:**
- Обновлённый `backend/app/services/reminder_service.py` — метод `send_reminder()`

**Done when:**
1. Сигнатура: `async def send_reminder(self, task: Task, user: User, offset_minutes: int | None = None) -> Notification`
2. offset-режим: создает новый список `sent = list(task.sent_reminder_offsets or [])`, добавляет offset, присваивает обратно
3. offset-режим: `reminder_fired = True` только когда `set(reminder_offsets) <= set(sent)`
4. reminder_time режим: `last_reminder_sent_at = now`, `reminder_fired = True` безусловно

**Acceptance criteria:**
- [ ] Новый параметр `offset_minutes: int | None = None` в сигнатуре
- [ ] offset-ветка: `sent = list(task.sent_reminder_offsets or []); sent.append(offset_minutes); task.sent_reminder_offsets = sent` (без in-place мутации!)
- [ ] offset-ветка: `all_sent = set(task.reminder_offsets or []) <= set(sent); if all_sent: task.reminder_fired = True`
- [ ] reminder_time ветка: `task.last_reminder_sent_at = datetime.now(ZoneInfo('UTC')); task.reminder_fired = True`
- [ ] `await self.db.flush()` в конце метода

**depends_on:** [L1/01]
**impact:** 5
**complexity:** 2
**risk:** 3
**priority_score:** 6.5
**Est. effort:** XS

**LLM Prompt Hint:** "Обнови метод send_reminder в backend/app/services/reminder_service.py. Добавь параметр offset_minutes: int | None = None. Для offset-режима: записывай offset в sent_reminder_offsets (создавая новый список!), reminder_fired=True только когда ВСЕ offsets отправлены. Для reminder_time: last_reminder_sent_at + reminder_fired=True. Следуй коду из дизайн-документа."
