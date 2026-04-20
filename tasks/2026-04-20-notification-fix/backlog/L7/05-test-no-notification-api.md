### L7-05 — Test: Browser without Notification API

**Goal:** Проверить graceful degradation когда браузер не поддерживает Notification API.

**Input:** Приложение с выполненными L6-02

**Output:** Результаты теста (console logs, UI verification)

**Done when:**
- Приложение не крашится без Notification API
- Toast всегда показывается
- Колокольчик работает

**Acceptance criteria:**
- [ ] DevTools → Console открыт
- [ ] Эмуляция браузера без Notification API: `window.Notification = undefined`
- [ ] Страница перезагружена
- [ ] Создано напоминание на +1 минуту
- [ ] Подождано 2 минуты
- [ ] Console показывает: "[NotificationProvider] Notification API supported: false"
- [ ] Console показывает: "[NotificationProvider] Showing toast (browser notifications disabled or not supported)"
- [ ] Приложение не крашится
- [ ] Toast появился
- [ ] Колокольчик показывает количество

**depends_on:** [L6-02]

**impact:** 4 (high - browser compatibility)
**complexity:** 1 (trivial - ручное тестирование)
**risk:** 1 (safe - только тестирование)

**priority_score:** (4 × 2 + 1) / 1 = 9.0

**Est. effort:** S (30 minutes)

**LLM Prompt Hint:**
Manual test: 1) Open DevTools → Console. 2) Emulate browser without Notification API: `window.Notification = undefined`. 3) Reload page. 4) Create reminder for +1 minute. 5) Wait 2 minutes. 6) Check console for expected logs. 7) Verify app doesn't crash, toast shown, bell works. Document results.
