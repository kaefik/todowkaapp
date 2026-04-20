### L6-02 — Frontend: Fix NotificationProvider handler with feature detection

**Goal:** Исправить handler для browser notifications: добавить feature detection, убрать зависимость от enabled, добавить graceful degradation.

**Input:** Файл `frontend/src/components/NotificationProvider.tsx` (существующий useEffect handler)

**Output:** Обновленный файл `frontend/src/components/NotificationProvider.tsx` с исправленным handler

**Done when:**
- Handler всегда регистрируется (убран `if (!enabled) return`)
- Добавлен feature detection: `isSupported = typeof Notification !== 'undefined'`
- Handler использует notificationData из event (если есть), иначе ищет в store
- Browser notification показывается только если isSupported && enabled
- Toast fallback всегда показывается если browser notification не сработал
- Все шаги логируются с префиксом `[NotificationProvider]`

**Acceptance criteria:**
- [ ] Ранний return `if (!enabled)` УБРАН
- [ ] `const isSupported = typeof Notification !== 'undefined'` добавлен
- [ ] Логирование setup: "[NotificationProvider] Setting up reminder handler"
- [ ] Логирование feature detection: "[NotificationProvider] Notification API supported:"
- [ ] Логирование события: "[NotificationProvider] task:reminder-fired event" с taskId, enabled, isSupported
- [ ] Логирование notificationData (из event)
- [ ] Логирование выбора источника данных (event vs store)
- [ ] try-catch для showReminder
- [ ] Toast fallback для всех сценариев (disabled, not supported, failed)
- [ ] Код проходит TypeScript проверку
- [ ] Console показывает полный путь события (start → find → show → end)

**depends_on:** [L1-01]

**impact:** 5 (core feature - основной fix для browser notifications)
**complexity:** 3 (moderate - требует объединения нескольких логик)
**risk:** 3 (medium - меняет критический path handler)

**priority_score:** (5 × 2 + 3) / 3 = 4.3

**Est. effort:** M (2 hours)

**LLM Prompt Hint:**
Read frontend/src/components/NotificationProvider.tsx. In useEffect handler: 1) Remove early return `if (!enabled) return`. 2) Add feature detection: `const isSupported = typeof Notification !== 'undefined'`. 3) Log setup and feature detection. 4) In handler: extract taskId and notificationData from event, log all. 5) Find title: first try notificationData?.message, then search in store. 6) Show browser notification only if isSupported && enabled, with try-catch. 7) Always fallback to toast if browser notification fails or is disabled/not supported. 8) Add extensive logging for all decisions. Return complete updated file with full imports.
