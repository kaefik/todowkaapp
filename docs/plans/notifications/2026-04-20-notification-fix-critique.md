# 🔍 Критика плана: 2026-04-20-notification-fix.md

**Дата:** 2026-04-20
**Критикуемый документ:** [2026-04-20-notification-fix.md](./2026-04-20-notification-fix.md)

---

## 📋 Executive Summary

План детально описывает диагностику и исправление, но содержит **критические проблемы**:

1. **🔴 BLOCKER - Этап 5 (Мониторинг) избыточен для bug fix** - Sentry, Google Analytics, Custom dashboard не нужны для исправления бага. Это Phase 2.
2. **🔴 BLOCKER - Нет обработки failure states** - Что если SSE падает? Что если браузер не поддерживает Notification API?
3. **🔴 BLOCKER - Store может быть пустым при SSE event** - Handler найдет notification и покажет "Напоминание" (default title).
4. **🟡 WARNING - Противоречие между 3.1 и 2.1** - В 2.1 проблема "Handler не регистрируется если enabled=false", но 3.1 предлагает "УБРАТЬ: if (!enabled) return" - это разные решения.

---

## Lens 1: Completeness

### ✅ Что есть:
- Все user-facing features описаны
- Data models определены (через ссылки на файлы)
- External dependencies названы
- Error handling частично описан

### ❌ Что не хватает:
- **🔴 BLOCKER**: Auth/security strategy не описана явно - только "проверить auth токен"
- **🔴 BLOCKER**: Failure states не описаны полностью:
  - Что если SSE connection падает после показа browser notification?
  - Что если browser блокирует уведомления (не просто denied)?
  - Что если multiple notifications fire одновременно?
- **🟡 WARNING**: Observability/logging strategy описана в Этапе 5, но не интегрирована в исправления

---

## Lens 2: Consistency

### 🟡 WARNING - Противоречие 3.1 vs 2.1

**В 2.1 (проблема):**
```
Handler не регистрируется если `enabled=false`
```

**В 3.1 (решение):**
```
// УБРАТЬ: if (!enabled) return
```

Это **разные решения**!
- 2.1 предполагает: нужно убрать ранний return, чтобы handler всегда регистрировался
- 3.1 предлагает: убрать проверку `if (!enabled) return` из самого useEffect

**Что нужно:** Явно указать, какое решение выбрано.

### 🟢 SUGGESTION - Offline mode
Этапы 4.3 и 4.4 проверяют reconnect, но нет проверки offline mode (polling fallback).

---

## Lens 3: Assumptions & Risks

### 🔴 BLOCKER - Assumes SSE connection is always available

**Инверсия:** SSE connection fails and doesn't reconnect
**Влияние:** User never gets notifications
**Митигация:** Add polling fallback when SSE fails (упомянуто в 4.3, но не в fixes)

### 🔴 BLOCKER - Assumes browser notifications API is always supported

**Инверсия:** Browser doesn't support Notification API
**Влияние:** Code throws errors, toast fallback might not work
**Митигация:** Add feature detection and graceful degradation (упомянуто в 1.1, но не в fixes)

### 🔴 BLOCKER - Assumes notifications in store always match SSE events

**Инверсия:** SSE event fires before notification is in store
**Влияние:** Handler finds no notification, shows "Напоминание" (default title)
**Митигация:** Add retry mechanism or store notification data in event payload (не упомянуто)

### 🟡 WARNING - Assumes user has stable internet connection

**Инверсия:** User loses internet connection
**Влияние:** SSE drops, notifications delayed
**Митигация:** Polling fallback with exponential backoff (частично в 4.3)

---

## Lens 4: YAGNI & Scope Creep

### ❌ BLOCKER - Этап 5 (Мониторинг) избыточен

**Что в Этапе 5:**
- Frontend logging (console.log)
- Backend metrics (logger.info)
- Production monitoring (Sentry, Google Analytics, Custom dashboard)

**Проблема:** Это Phase 2, не bug fix!
- Sentry, Google Analytics, Custom dashboard для исправления бага?
- Это out of scope для текущей задачи

**Решение:** Убрать Этап 5 целиком, оставить только logging как часть исправлений.

### 🟡 WARNING - Settings UI (3.5) может быть Phase 2

**Что в 3.5:** Добавить кнопку "Разрешить уведомления" в Settings

**Проблема:** Это не критично для исправления бага. Пользователь может дать разрешение через браузер.

**Решение:** Defer to Phase 2 или оставить как optional.

---

## Lens 5: Technical Feasibility

### ✅ Что работает:
- Все технологии существуют
- Security requirements не конфликтуют с UX

### 🟡 WARNING - Performance requirements не указаны

**Вопрос:** Сколько уведомлений может быть одновременно?
- 10? 100? 1000?
- Нужно ли batching для multiple notifications?

**Решение:** Указать ожидаемый load и добавить batching если нужно.

---

## Assumption Inversion (Top 3)

### Assumption 1: SSE connection is always available
**Инверсия:** SSE connection fails and doesn't reconnect
**Влияние:** User never gets notifications
**Митигация:**
```typescript
// Добавить polling fallback в notificationStore.ts
if (sseState === 'error') {
  // Start polling with exponential backoff
  startPolling(30000) // 30 seconds
}
```

### Assumption 2: Browser notifications API is always supported
**Инверсия:** Browser doesn't support Notification API
**Влияние:** Code throws errors, toast fallback might not work
**Митигация:**
```typescript
// В NotificationProvider.tsx
const isSupported = typeof Notification !== 'undefined'
if (!isSupported) {
  console.warn('Browser notifications not supported')
  // Always show toast
  addToast({ /* ... */ })
  return
}
```

### Assumption 3: Notifications in store always match SSE events
**Инверсия:** SSE event fires before notification is in store
**Влияние:** Handler finds no notification, shows "Напоминание" (default title)
**Митигация:**
```typescript
// В SSE event payload добавить notification data
// backend/app/event_bus.py
event_bus.publish('notification', {
  type: 'due_reminder',
  task_id: task.id,
  notification_data: {
    id: notification.id,
    message: notification.message,
    // ...
  }
})

// В frontend handler
const { taskId, notification_data } = data.data
const notification = notification_data || notifications.find(...)
```

---

## Missing Scenarios

| Scenario | Risk | Suggested handling |
|----------|------|-------------------|
| SSE connection drops after browser notification shows | 🟡 WARNING | Add toast fallback with retry when SSE reconnects |
| Multiple notifications fire simultaneously | 🟡 WARNING | Batch dispatch, show summary toast |
| User closes browser before notification fires | 🟡 WARNING | Store notification in DB, show on next open |
| Browser blocks notifications (not just denied) | 🔴 BLOCKER | Detect blocking, show toast with explanation |
| Notification permission changes during session | 🟡 WARNING | Listen for permission change event, re-register handler |
| SSE event fires but store is empty (initial load) | 🔴 BLOCKER | Store notification data in SSE event payload |
| User on mobile with restricted background | 🟡 WARNING | Use app badges, push notifications (Phase 2) |

---

## Summary Table

| # | Lens | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 1 | Completeness | Auth/security strategy не описана | 🟡 WARNING | Добавить явное описание auth flow |
| 2 | Completeness | Failure states не описаны | 🔴 BLOCKER | Добавить handling для всех failure states |
| 3 | Completeness | Observability не интегрирована | 🟡 WARNING | Интегрировать logging в все исправления |
| 4 | Consistency | 3.1 vs 2.1 contradiction | 🟡 WARNING | Выбрать один подход явно |
| 5 | Consistency | Offline mode не проверен | 🟡 WARNING | Добавить offline mode тест-кейс |
| 6 | Assumptions | SSE might not reconnect | 🔴 BLOCKER | Добавить polling fallback явно |
| 7 | Assumptions | Notification API might not be supported | 🔴 BLOCKER | Добавить feature detection |
| 8 | Assumptions | Store might be empty when SSE fires | 🔴 BLOCKER | Хранить notification data в SSE payload |
| 9 | YAGNI | Этап 5 (monitoring) is overkill | ❌ BLOCKER | Убрать Этап 5, defer to Phase 2 |
| 10 | YAGNI | Settings UI (3.5) is Phase 2 | 🟡 WARNING | Убрать или defer to Phase 2 |
| 11 | Feasibility | Performance requirements не указаны | 🟡 WARNING | Указать ожидаемый load |

---

## Verdict

```
🔴 VERDICT: NEEDS REVISION — return to Brainstorming
```

### Критические blockers:

1. **Этап 5 (Мониторинг) избыточен** - Sentry, Google Analytics, Custom dashboard не нужны для bug fix
2. **Нет обработки failure states** - Что если SSE падает? Что если браузер не поддерживает Notification API?
3. **Store может быть пустым при SSE event** - Handler найдет notification и покажет "Напоминание" (default title)
4. **Противоречие 3.1 vs 2.1** - Неясно, какое решение выбрано

### Обязательные исправления перед реализацией:

1. **Убрать Этап 5 целиком** - defer to Phase 2
2. **Добавить polling fallback** - когда SSE fails (fix 3.6)
3. **Добавить feature detection** - для Notification API (fix 3.7)
4. **Хранить notification data в SSE payload** - чтобы handler не зависел от store (fix 3.8)
5. **Убрать или defer Settings UI (3.5)** - Phase 2
6. **Интегрировать logging** - во все исправления, не отдельная секция
7. **Уточнить решение 3.1** - явно указать, убираем ли `if (!enabled) return`

### Опциональные улучшения:

1. Добавить batching для multiple notifications
2. Добавить permission change listener
3. Добавить offline mode тест-кейс

---

## Recommended Next Steps

1. ✅ Обсудить критику с командой
2. 🔄 Исправить план согласно blocker'ам
3. ✅ Провести вторую критику (опционально)
4. 🚀 Перейти к Design-to-Plan

---

**Документ создан:** 2026-04-20
**Автор:** Plan Critic (AI)
**Статус:** NEEDS REVISION
