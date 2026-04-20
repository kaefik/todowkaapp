### L7-02 — Test: Create reminder with disabled browser notifications

**Goal:** Проверить что toast fallback работает когда browser notifications отключены.

**Input:** Приложение с выполненными L6-02

**Output:** Результаты теста (console logs, UI verification)

**Done when:**
- Browser notification НЕ появился
- Toast появился как fallback
- Колокольчик показывает количество
- Console logs показывают что toast показан

**Acceptance criteria:**
- [ ] Browser notifications отключены в настройках (localStorage = false)
- [ ] Создано напоминание на +1 минуту
- [ ] Подождано 2 минуты
- [ ] Console показывает: "[NotificationProvider] Will show: { isSupported: true, enabled: false }"
- [ ] Console показывает: "[NotificationProvider] Showing toast (browser notifications disabled or not supported)"
- [ ] Browser notification НЕ появился
- [ ] Toast появился в UI
- [ ] Колокольчик показывает количество

**depends_on:** [L6-02]

**impact:** 5 (core feature - fallback path)
**complexity:** 1 (trivial - ручное тестирование)
**risk:** 1 (safe - только тестирование)

**priority_score:** (5 × 2 + 1) / 1 = 11.0

**Est. effort:** S (30 minutes)

**LLM Prompt Hint:**
Manual test: 1) Open DevTools → Console. 2) Disable browser notifications in settings (localStorage = false). 3) Create reminder for +1 minute. 4) Wait 2 minutes. 5) Check console for expected logs. 6) Verify browser notification NOT shown, toast shown as fallback, bell shows count. Document results.
