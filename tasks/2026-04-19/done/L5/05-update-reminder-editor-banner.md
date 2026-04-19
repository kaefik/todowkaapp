### L5/05 — Обновить ReminderEditor — информационный баннер вместо блокировки (BUG-8 frontend)

**Goal:** Показать информационный баннер "Напоминание уже отправлено" вместо полной блокировки UI напоминаний для завершённых задач с fired reminder.

**Input:**
- Текущий код: `frontend/src/components/ReminderEditor.tsx` (184 строки)
- Текущая логика: `enabled` блокируется при `reminderFired` (строка 35, 51)

**Output:**
- Обновлённый `frontend/src/components/ReminderEditor.tsx`

**Done when:**
1. При `reminderFired = true` показывается информационный баннер вместо заблокированного UI
2. Баннер содержит текст: "Напоминание для этой задачи уже отправлено."
3. Редактирование остаётся заблокированным (баннер информационный, не функциональный)

**Acceptance criteria:**
- [ ] Когда `reminderFired` и есть reminder (reminderTime или reminderOffsets): показывается баннер
- [ ] Баннер стилизован как информационный (amber/yellow)
- [ ] Текст баннера: "Напоминание для этой задачи уже отправлено."
- [ ] Checkbox "Напоминание" скрыт или disabled
- [ } Для незавершённых задач без reminderFired — UI без изменений

**depends_on:** []
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS

**LLM Prompt Hint:** "Обнови ReminderEditor в frontend/src/components/ReminderEditor.tsx. Когда reminderFired=true и есть напоминание — покажи информационный баннер 'Напоминание уже отправлено' вместо заблокированного checkbox. Используй amber/yellow стиль через Tailwind. Редактирование остаётся заблокированным."
