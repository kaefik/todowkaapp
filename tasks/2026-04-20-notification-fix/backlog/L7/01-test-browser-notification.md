### L7-01 — Test: Create reminder with browser notification

**Goal:** Проверить что browser notification появляется при создании напоминания.

**Input:** Приложение с выполненными L1-01, L6-01, L6-02, L5-01, L5-02

**Output:** Результаты теста (console logs, UI verification)

**Done when:**
- Browser notification показан
- Колокольчик показывает количество
- Уведомление в dropdown
- Console logs показывают полный путь события

**Acceptance criteria:**
- [ ] Создана задача с due_date = сегодня
- [ ] reminder_time = текущее время + 1 минута
- [ ] Подождано 2 минуты
- [ ] Console показывает: "[NotificationProvider] === Reminder Event Start ==="
- [ ] Console показывает: "[NotificationProvider] taskTitle: <название задачи>"
- [ ] Console показывает: "[NotificationProvider] Will show: { isSupported: true, enabled: true }"
- [ ] Console показывает: "[BrowserNotifications] Showing notification: { title: ..., permission: 'granted', enabled: true }"
- [ ] Browser notification появился в ОС
- [ ] Колокольчик показывает количество
- [ ] Уведомление видно в dropdown

**depends_on:** [L1-01, L6-01, L6-02, L5-01, L5-02]

**impact:** 5 (core feature - основной use case)
**complexity:** 1 (trivial - ручное тестирование)
**risk:** 1 (safe - только тестирование)

**priority_score:** (5 × 2 + 1) / 1 = 11.0

**Est. effort:** S (30 minutes)

**LLM Prompt Hint:**
Manual test: 1) Open DevTools → Console. 2) Create task with due_date = today. 3) Set reminder_time = current time + 1 minute. 4) Wait 2 minutes. 5) Check console for expected logs. 6) Verify browser notification appeared, bell shows count, notification in dropdown. Document results.
