### L3/01 — Удалить внутренние поля из `TaskUpdate` Pydantic-схемы (BUG-1c)

**Goal:** Удалить `reminder_fired` и `last_reminder_sent_at` из `TaskUpdate` схемы, чтобы клиент не мог управлять внутренними полями дедупликации через API.

**Input:**
- Текущий код: `backend/app/schemas/task.py:56-81` (класс TaskUpdate)

**Output:**
- Обновлённый `backend/app/schemas/task.py` — класс `TaskUpdate` без внутренних полей

**Done when:**
1. `reminder_fired` удалён из `TaskUpdate`
2. `last_reminder_sent_at` удалён из `TaskUpdate`
3. `sent_reminder_offsets` НЕ добавлен ни в одну клиентскую схему
4. `TaskResponse` сохраняет `reminder_fired` и `last_reminder_sent_at` (полезно для frontend)

**Acceptance criteria:**
- [ ] В TaskUpdate нет поля `reminder_fired`
- [ ] В TaskUpdate нет поля `last_reminder_sent_at`
- [ ] В TaskUpdate нет поля `sent_reminder_offsets`
- [ ] В TaskCreate нет поля `sent_reminder_offsets`
- [ ] TaskResponse содержит `reminder_fired` и `last_reminder_sent_at` (без изменений)
- [ ] TaskResponse НЕ содержит `sent_reminder_offsets`

**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 3
**priority_score:** 11.0
**Est. effort:** XS

**LLM Prompt Hint:** "Удали поля reminder_fired и last_reminder_sent_at из класса TaskUpdate в backend/app/schemas/task.py. НЕ добавляй sent_reminder_offsets ни в одну схему. TaskResponse не трогай — там эти поля нужны."
