### L2/07 — Удалить `should_send_reminder()` — мертвый код (BUG-13)

**Goal:** Удалить неиспользуемый метод `should_send_reminder()` из ReminderService.

**Input:**
- Текущий код: `backend/app/services/reminder_service.py:177-187`

**Output:**
- Обновлённый `backend/app/services/reminder_service.py` — метод `should_send_reminder()` удалён

**Done when:**
1. Метод `should_send_reminder()` полностью удалён из класса ReminderService
2. Нет других ссылок на этот метод в кодовой базе

**Acceptance criteria:**
- [ ] Метод `should_send_reminder` не существует в `backend/app/services/reminder_service.py`
- [ ] `grep -r "should_send_reminder" backend/` не находит результатов

**depends_on:** [L2/02]
**impact:** 1
**complexity:** 1
**risk:** 1
**priority_score:** 3.0
**Est. effort:** XS

**LLM Prompt Hint:** "Удали метод should_send_reminder из класса ReminderService в backend/app/services/reminder_service.py. Проверь что нет других ссылок на этот метод."
