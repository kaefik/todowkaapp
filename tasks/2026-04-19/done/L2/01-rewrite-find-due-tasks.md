### L2/01 — Переписать `find_due_tasks()` — унифицированный return type, offset dedup, timezone fix (BUG-1 + BUG-2)

**Goal:** Полностью переписать `find_due_tasks()` для поддержки множественных offset-напоминаний через `sent_reminder_offsets` и исправить timezone-баг в клэмпинге.

**Input:**
- Текущий код: `backend/app/services/reminder_service.py:21-81`
- Новая колонка `sent_reminder_offsets` (L1/01)
- Полный код из дизайн-документа: `docs/plans/notifications/2026-04-19-notification-fix-v2.md` строки 64-109

**Output:**
- Обновлённый `backend/app/services/reminder_service.py` — метод `find_due_tasks()`

**Done when:**
1. Return type изменён на `list[tuple[Task, int | None]]`
2. `reminder_time` ветка возвращает `(task, None)` — timezone fix: `due_date_local.time()` вместо `due_date.time()`
3. `reminder_offsets` ветка проверяет `sent_reminder_offsets` — отправленные offsets пропускаются
4. `reminder_offsets` ветка возвращает `(task, offset_minutes)` — только первый несендленный offset
5. Код соответствует полному примеру из дизайн-документа (строки 64-109)

**Acceptance criteria:**
- [ ] Сигнатура: `async def find_due_tasks(self) -> list[tuple[Task, int | None]]`
- [ ] reminder_time ветка: сравнение `due_date_local.time() != time(0, 0)` (BUG-2 fix)
- [ ] reminder_time ветка: возвращает `(task, None)`
- [ ] reminder_offsets ветка: `sent_offsets = set(task.sent_reminder_offsets or [])`
- [ ] reminder_offsets ветка: `if offset_minutes in sent_offsets: continue`
- [ ] reminder_offsets ветка: возвращает `(task, offset_minutes)` + `break`
- [ ] Код компилируется без ошибок (`python -c "from app.services.reminder_service import ReminderService"`)

**depends_on:** [L1/01]
**impact:** 5
**complexity:** 3
**risk:** 4
**priority_score:** 4.67
**Est. effort:** S

**LLM Prompt Hint:** "Полностью перепиши метод find_due_tasks в backend/app/services/reminder_service.py. Return type: list[tuple[Task, int | None]]. Две ветки: reminder_time → (task, None) с timezone fix (due_date_local.time()), reminder_offsets → (task, offset_minutes) с проверкой sent_reminder_offsets. Следуй точному коду из дизайн-документа."
