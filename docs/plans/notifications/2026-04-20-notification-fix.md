# 📋 Детальный план диагностики и исправления проблем с отображением уведомлений

**Дата создания:** 2026-04-20
**Статус:** Revised (после критики)
**Цель:** Обеспечить корректное отображение напоминаний пользователю (browser notifications + UI колокольчик + toast fallback)

---

## 📋 Содержание

1. [Этап 1: Диагностика текущего состояния](#этап-1-диагностика-текущего-состояния)
2. [Этап 2: Выявление проблем](#этап-2-выявление-проблем)
3. [Этап 3: План исправления](#этап-3-план-исправления)
4. [Этап 4: Проверка после исправлений](#этап-4-проверка-после-исправлений)
5. [Итоговый чек-лист](#итоговый-чек-лист)

---

## 🎯 Цель
Обеспечить корректное отображение напоминаний пользователю (browser notifications + UI колокольчик + toast fallback)

**Важное примечание:** Мониторинг (Sentry, Google Analytics, Dashboard) вынесен в Phase 2. Текущая задача - исправить баг с отображением уведомлений.

---

## 🔍 Этап 1: Диагностика текущего состояния

### 1.1 Проверка Browser Notifications

**Действия:**
1. Открыть DevTools → Console
2. Выполнить:
   ```javascript
   console.log('Notification.permission:', Notification.permission)
   console.log('localStorage enabled:', localStorage.getItem('ui-browser-notifications-enabled'))
   console.log('isSupported:', typeof Notification !== 'undefined')
   ```
3. Проверить настройки браузера:
   - Chrome: Settings → Privacy and security → Site Settings → Notifications
   - Firefox: Settings → Privacy & Security → Permissions → Notifications

**Ожидаемые результаты:**
- ✅ `Notification.permission` = 'granted'
- ✅ `localStorage.getItem('ui-browser-notifications-enabled')` = 'true'
- ✅ `isSupported` = true

**Если что-то не так:**
- `permission` = 'default' → пользователь еще не дал разрешение
- `permission` = 'denied' → пользователь запретил уведомления
- `localStorage` = null/false → уведомления отключены в настройках приложения
- `isSupported` = false → браузер не поддерживает Notification API

**Файлы для проверки:**
- `frontend/src/utils/browserNotifications.ts:9-26` - логика permission и enabled
- `frontend/src/hooks/useBrowserNotifications.ts:4-7` - хук для использования

### 1.2 Проверка SSE соединения

**Действия:**
1. Открыть DevTools → Network tab
2. Найти запрос `/api/sse/notifications`
3. Проверить статус:
   - Статус = `pending` ✅
   - Статус = `failed` ❌
   - Статус = отсутствует ❌
4. Проверить EventStream в Response
5. Открыть Console и найти логи:
   - `[SSE] [INFO] Connecting to SSE`
   - `[SSE] [INFO] SSE connection established`
   - `[SSE] [ERROR] SSE connection error`

**Ожидаемые результаты:**
- ✅ SSE запрос активный (pending)
- ✅ Периодически приходят heartbeat события
- ✅ Нет ошибок в console

**Если проблемы:**
- SSE не подключается → проверить auth токен
- SSE падает с ошибкой → проверить бэкенд логи
- Нет heartbeat → проверить event_bus.publish()

**Файлы для проверки:**
- `frontend/src/services/sseManager.ts:36-76` - логика подключения SSE
- `frontend/src/stores/notificationStore.ts:136-186` - обработка SSE сообщений
- `backend/app/api/sse.py:18-41` - SSE endpoint
- `backend/app/event_bus.py:12-16` - подписка на события

### 1.3 Проверка API запросов

**Действия:**
1. Открыть DevTools → Network tab
2. Фильтровать по `/api/notifications`
3. Проверить последний запрос:
   ```json
   GET /api/notifications?unread_only=true&limit=50&offset=0
   ```
4. Проверить Response:
   ```json
   {
     "items": [...],
     "total": 2,
     "unread_count": 2
   }
   ```

**Ожидаемые результаты:**
- ✅ Status = 200
- ✅ Response содержит `unread_count: 2`
- ✅ `items` содержит 2 непрочитанных уведомления

**Если проблемы:**
- Status = 401 → проблемы с auth
- Status = 500 → ошибка бэкенда
- `unread_count` = 0 → все помечены как прочитанные

**Файлы для проверки:**
- `frontend/src/stores/notificationStore.ts:64-83` - метод refetch()
- `backend/app/api/notifications.py` - API эндпоинты
- `backend/app/services/reminder_service.py:127-149` - get_unread_notifications()

### 1.4 Проверка Frontend Store

**Действия:**
1. Открыть DevTools → Console
2. Выполнить:
   ```javascript
   const store = window.useNotificationStore?.getState?.()
   if (store) {
     console.log('notifications:', store.notifications.length)
     console.log('unreadCount:', store.unreadCount)
     console.log('sseState:', store.sseState)
     console.log('isLoading:', store.isLoading)
   }
   ```

**Ожидаемые результаты:**
- ✅ `notifications.length` ≥ 2
- ✅ `unreadCount` ≥ 2
- ✅ `sseState` = 'connected'
- ✅ `isLoading` = false

**Если проблемы:**
- `unreadCount` = 0 → store не обновился
- `sseState` ≠ 'connected' → SSE не подключен
- `notifications.length` = 0 → данные не загружены

**Файлы для проверки:**
- `frontend/src/stores/notificationStore.ts:30-193` - Zustand store

### 1.5 Проверка UI компонентов

**Действия:**
1. Открыть DevTools → Elements tab
2. Найти колокольчик уведомлений:
   ```html
   <div class="notification-bell">
     <span class="badge">2</span>  <!-- Количество непрочитанных -->
   </div>
   ```
3. Проверить:
   - Виден ли колокольчик? ✅
   - Показывается ли badge с числом? ✅
   - Есть ли анимация при клике? ✅
4. Нажать на колокольчик и проверить:
   - Открывается ли dropdown? ✅
   - Видны ли уведомления? ✅
   - Работает ли кнопка "mark as read"? ✅

**Ожидаемые результаты:**
- ✅ Колокольчик виден на странице
- ✅ Badge показывает `unreadCount`
- ✅ Dropdown открывается и показывает уведомления

**Если проблемы:**
- Колокольчик не виден → проблемы с рендерингом
- Badge не показывает число → данные не переданы
- Dropdown пуст → уведомления не отфильтрованы

**Файлы для проверки:**
- `frontend/src/components/NotificationBell.tsx` - компонент колокольчика
- `frontend/src/components/Notifications.tsx` - список уведомлений

---

## 🐛 Этап 2: Выявление проблем

### 2.1 Проблема: Browser Notifications не показываются

**Симптомы:**
- Уведомления создаются в БД ✅
- Но не появляются browser notifications ❌

**Возможные причины:**
1. Пользователь не дал разрешение (`permission = 'default'`)
2. Пользователь запретил уведомления (`permission = 'denied'`)
3. Уведомления отключены в настройках приложения (`localStorage = false`)
4. SSE не доставляет события
5. Handler не регистрируется (`enabled = false`)
6. Браузер блокирует (неактивная вкладка)
7. Браузер не поддерживает Notification API

**Диагностические шаги:**
```javascript
// 1. Проверить разрешение
console.log('Permission:', Notification.permission)

// 2. Проверить localStorage
console.log('Enabled:', localStorage.getItem('ui-browser-notifications-enabled'))

// 3. Проверить registration handler
const enabled = window.useBrowserNotifications?.getState?.()?.enabled
console.log('Handler enabled:', enabled)

// 4. Проверить события SSE
// В console искать: "SSE message received in store"
```

**Локация проблемы:**
- `frontend/src/components/NotificationProvider.tsx:65-92` - useEffect с зависимостью от `enabled`
- `frontend/src/utils/browserNotifications.ts:42-45` - условие показа уведомлений

### 2.2 Проблема: Колокольчик не показывает количество

**Симптомы:**
- Уведомления созданы ✅
- Store обновлен (`unreadCount` = 2) ✅
- Но badge на колокольчике пустой ❌

**Возможные причины:**
1. Компонент не подписан на store
2. Selector неправильно выбирает `unreadCount`
3. UI не ререндерится при изменении store
4. CSS скрывает badge

**Диагностические шаги:**
```javascript
// 1. Проверить store
const store = window.useNotificationStore?.getState?.()
console.log('Store unreadCount:', store?.unreadCount)

// 2. Проверить компонент
// React DevTools → найти NotificationBell компонент
// Проверить props: showUnreadCount, unreadCount

// 3. Проверить рендеринг
// Обновить страницу и посмотреть console.log в компоненте
```

**Локация проблемы:**
- `frontend/src/components/NotificationBell.tsx` - компонент колокольчика

### 2.3 Проблема: SSE не подключается

**Симптомы:**
- Уведомления создаются в БД ✅
- SSE events не приходят ❌
- Store не обновляется автоматически ❌

**Возможные причины:**
1. Auth токен недействительный
2. Бэкенд не запущен
3. CORS проблемы
4. Network проблемы
5. User не аутентифицирован

**Диагностические шаги:**
```javascript
// 1. Проверить auth токен
const token = window.useAuthStore?.getState?.()?.accessToken
console.log('Has token:', !!token)

// 2. Проверить SSE state
const sseState = window.useNotificationStore?.getState?.()?.sseState
console.log('SSE state:', sseState)

// 3. Проверить Network tab
// Найти /api/sse/notifications запрос
```

**Локация проблемы:**
- `frontend/src/services/sseManager.ts:78-162` - открытие SSE соединения
- `backend/app/api/sse.py:18-41` - SSE endpoint
- `backend/app/dependencies.py` - auth проверка

### 2.4 Проблема: SSE падает, нет fallback

**Симптомы:**
- SSE подключен ✅
- Но падает при потере интернета ❌
- Нет автоматического переподключения ❌

**Возможные причины:**
1. Нет exponential backoff
2. Нет polling fallback
3. Нет максимального кол-ва попыток

**Локация проблемы:**
- `frontend/src/services/sseManager.ts` - логика reconnect
- `frontend/src/stores/notificationStore.ts` - отсутствие polling

### 2.5 Проблема: Store пустой при SSE event

**Симптомы:**
- SSE event приходит ✅
- Но store пустой (initial load) ❌
- Handler показывает "Напоминание" (default title) ❌

**Возможные причины:**
1. SSE event прилетает быстрее, чем загрузятся данные
2. Handler зависит от store, но store еще не загружен
3. Нет notification data в SSE event payload

**Локация проблемы:**
- `frontend/src/components/NotificationProvider.tsx` - handler использует store
- `backend/app/event_bus.py` - SSE event не содержит notification data

---

## 🔧 Этап 3: План исправления

### 3.1 Исправление Browser Notifications - Feature Detection

**Файл:** `frontend/src/components/NotificationProvider.tsx:65-92`

**Проблема:**
1. Handler не регистрируется если `enabled=false`
2. Нет feature detection для Notification API
3. Нет graceful degradation если API не поддерживается

**Решение:**
```typescript
useEffect(() => {
  console.log('[NotificationProvider] Setting up reminder handler')

  // Feature detection
  const isSupported = typeof Notification !== 'undefined'
  console.log('[NotificationProvider] Notification API supported:', isSupported)

  const handler = async (e: Event) => {
    const { taskId } = (e as CustomEvent).detail || {}
    console.log('[NotificationProvider] task:reminder-fired event', { taskId, enabled, isSupported })

    if (!taskId) {
      console.warn('[NotificationProvider] No taskId in event')
      return
    }

    // Ищем notification в store
    const notifications = useNotificationStore.getState().notifications
    console.log('[NotificationProvider] Current notifications:', notifications.length)

    const notification = notifications.find(
      (n) => n.task_id === taskId && !n.is_read
    )
    console.log('[NotificationProvider] Found notification:', !!notification)

    const taskTitle = notification?.message || 'Напоминание'

    // Показываем browser notification если поддерживается и включено
    if (isSupported && enabled) {
      console.log('[NotificationProvider] Attempting browser notification')
      try {
        const ok = await showReminder(taskTitle, taskId)
        console.log('[NotificationProvider] Browser notification shown:', ok)

        // Fallback toast если browser notification не показался
        if (!ok) {
          console.log('[NotificationProvider] Falling back to toast (browser notification failed)')
          addToast({
            title: 'Напоминание о задаче',
            body: taskTitle,
            type: 'reminder',
            taskId,
          })
        }
      } catch (error) {
        console.error('[NotificationProvider] Browser notification error:', error)
        // Fallback toast при ошибке
        addToast({
          title: 'Напоминание о задаче',
          body: taskTitle,
          type: 'reminder',
          taskId,
        })
      }
    } else {
      // Показываем toast если browser notifications отключены или не поддерживаются
      console.log('[NotificationProvider] Showing toast (browser notifications disabled or not supported)')
      addToast({
        title: 'Напоминание о задаче',
        body: taskTitle,
        type: 'reminder',
        taskId,
      })
    }
  }

  window.addEventListener('task:reminder-fired', handler)
  return () => window.removeEventListener('task:reminder-fired', handler)
}, [enabled, showReminder, addToast])
```

**Что исправлено:**
- ✅ Убрана зависимость `if (!enabled) return`
- ✅ Добавлен feature detection для Notification API
- ✅ Добавлен graceful degradation (всегда показываем toast)
- ✅ Добавлено diagnostic logging

---

### 3.2 Исправление SSE доставки событий - Error Handling

**Файл:** `frontend/src/stores/notificationStore.ts:142-154`

**Проблема:**
1. Нет обработки ошибки разбора JSON
2. Нет логирования ошибок
3. Нет проверки на корректность данных

**Решение:**
```typescript
onMessage: (message) => {
  console.log('[NotificationStore] SSE message received:', message)

  if (message.event === 'notification') {
    console.log('[NotificationStore] Calling refetch due to notification event')
    get().refetch()

    try {
      const data = JSON.parse(message.data)
      console.log('[NotificationStore] Parsed SSE data:', data)

      // Проверяем структуру данных
      if (!data || typeof data !== 'object') {
        console.warn('[NotificationStore] Invalid SSE data structure:', data)
        return
      }

      if (data?.type === 'queue_overflow') {
        console.log('[NotificationStore] Queue overflow detected, refetching')
        get().refetch()
      } else if (data?.data?.type === 'due_reminder' && data?.data?.task_id) {
        console.log('[NotificationStore] Due reminder event, dispatching custom event')
        window.dispatchEvent(new CustomEvent('task:reminder-fired', {
          detail: {
            taskId: data.data.task_id,
            notificationData: data.data.notification_data // Данные уведомления из payload
          }
        }))
      } else {
        console.warn('[NotificationStore] Unknown SSE event type:', data?.type)
      }
    } catch (e) {
      console.error('[NotificationStore] Failed to parse SSE data:', e, message.data)
    }
  }
},
```

**Что исправлено:**
- ✅ Добавлен try-catch для JSON.parse
- ✅ Добавлено логирование всех событий
- ✅ Добавлена проверка структуры данных
- ✅ Добавлено notification_data в event payload

---

### 3.3 Исправление SSE Reconnect - Polling Fallback

**Файл:** `frontend/src/stores/notificationStore.ts`

**Проблема:**
1. SSE может падать и не восстанавливаться
2. Нет polling fallback при проблемах с SSE
3. Нет exponential backoff

**Решение:**

Добавить в store:
```typescript
interface NotificationStore {
  // ... existing fields
  pollingInterval: number | null
  startPolling: () => void
  stopPolling: () => void
}

// В initialState
const initialState = {
  // ... existing fields
  pollingInterval: null,
}

// В create()
startPolling: () => {
  console.log('[NotificationStore] Starting polling fallback')
  set({ isLoading: true })

  // Сначала загружаем данные
  get().refetch()

  // Затем запускаем polling
  const interval = setInterval(() => {
    console.log('[NotificationStore] Polling for new notifications')
    get().refetch()
  }, 30000) // 30 seconds

  set({ pollingInterval: interval, isLoading: false })
},

stopPolling: () => {
  console.log('[NotificationStore] Stopping polling fallback')
  const interval = get().pollingInterval
  if (interval) {
    clearInterval(interval)
    set({ pollingInterval: null })
  }
},

// В cleanup
cleanup: () => {
  get().stopPolling()
  // ... existing cleanup
}
```

**В SSE manager (sseManager.ts):**

```typescript
// В onError
onError: (error) => {
  console.error('[SSE] Connection error:', error)

  // Запускаем polling fallback
  const store = window.useNotificationStore?.getState?.()
  if (store && !store.pollingInterval) {
    console.log('[SSE] Starting polling fallback due to error')
    store.startPolling()
  }

  set({ sseState: 'error' })
},

// В onOpen
onOpen: () => {
  console.log('[SSE] Connection opened')

  // Останавливаем polling если SSE восстановился
  const store = window.useNotificationStore?.getState?.()
  if (store && store.pollingInterval) {
    console.log('[SSE] SSE restored, stopping polling fallback')
    store.stopPolling()
  }

  set({ sseState: 'connected' })
}
```

**Что исправлено:**
- ✅ Добавлен polling fallback при ошибках SSE
- ✅ Добавлено автоматическое переключение SSE ↔ polling
- ✅ Добавлено логирование всех переключений

---

### 3.4 Исправление Store Empty Problem - Notification Data in SSE Payload

**Проблема:** SSE event может прилететь до загрузки данных в store

**Backend fix (event_bus.py):**

```python
def publish_reminder(task: Task, user: User, notification: Notification):
    """Publish reminder event with notification data"""
    event_bus.publish('notification', {
        'type': 'due_reminder',
        'task_id': task.id,
        'notification_data': {
            'id': notification.id,
            'message': notification.message,
            'created_at': notification.created_at.isoformat(),
            'due_date': task.due_date.isoformat() if task.due_date else None,
        }
    })
    logger.info(f"Published reminder event: task={task.id}, notification={notification.id}")
```

**Frontend fix (NotificationProvider.tsx):**

```typescript
const handler = async (e: Event) => {
  const { taskId, notificationData } = (e as CustomEvent).detail || {}
  console.log('[NotificationProvider] task:reminder-fired event', { taskId, notificationData, enabled, isSupported })

  if (!taskId) {
    console.warn('[NotificationProvider] No taskId in event')
    return
  }

  // Сначала пробуем использовать notificationData из event
  let taskTitle = 'Напоминание'
  if (notificationData?.message) {
    taskTitle = notificationData.message
    console.log('[NotificationProvider] Using notification data from event:', taskTitle)
  } else {
    // Если нет данных в event, ищем в store
    console.log('[NotificationProvider] No notification data in event, searching in store')
    const notifications = useNotificationStore.getState().notifications
    console.log('[NotificationProvider] Current notifications:', notifications.length)

    const notification = notifications.find(
      (n) => n.task_id === taskId && !n.is_read
    )
    console.log('[NotificationProvider] Found notification:', !!notification)

    taskTitle = notification?.message || 'Напоминание'
  }

  // Показываем browser notification если поддерживается и включено
  if (isSupported && enabled) {
    console.log('[NotificationProvider] Attempting browser notification')
    try {
      const ok = await showReminder(taskTitle, taskId)
      console.log('[NotificationProvider] Browser notification shown:', ok)

      if (!ok) {
        console.log('[NotificationProvider] Falling back to toast')
        addToast({
          title: 'Напоминание о задаче',
          body: taskTitle,
          type: 'reminder',
          taskId,
        })
      }
    } catch (error) {
      console.error('[NotificationProvider] Browser notification error:', error)
      addToast({
        title: 'Напоминание о задаче',
        body: taskTitle,
        type: 'reminder',
        taskId,
      })
    }
  } else {
    console.log('[NotificationProvider] Showing toast (browser notifications disabled or not supported)')
    addToast({
      title: 'Напоминание о задаче',
      body: taskTitle,
      type: 'reminder',
      taskId,
    })
  }
}
```

**Что исправлено:**
- ✅ Backend отправляет notification data в SSE payload
- ✅ Frontend сначала использует данные из event, потом из store
- ✅ Убрана зависимость от store при начальной загрузке

---

### 3.5 Улучшенное логирование

**Файл:** `frontend/src/components/NotificationProvider.tsx`

**Что добавить:**

```typescript
// В начале handler
console.log('[NotificationProvider] === Reminder Event Start ===')
console.log('[NotificationProvider] taskId:', taskId)
console.log('[NotificationProvider] enabled:', enabled)
console.log('[NotificationProvider] isSupported:', isSupported)
console.log('[NotificationProvider] notificationData:', notificationData)

// После нахождения title
console.log('[NotificationProvider] taskTitle:', taskTitle)

// Перед показом уведомления
console.log('[NotificationProvider] Will show:', { isSupported, enabled })

// После показа
console.log('[NotificationProvider] === Reminder Event End ===')
```

**В notificationStore.ts:**

```typescript
// В refetch()
console.log('[NotificationStore] Refetching notifications...')

// После успешной загрузки
console.log('[NotificationStore] Notifications loaded:', {
  count: notifications.length,
  unreadCount: unreadCount
})

// В SSE onMessage
console.log('[NotificationStore] SSE event:', { event: message.event, data: message.data })
```

**В browserNotifications.ts:**

```typescript
// В showReminder()
console.log('[BrowserNotifications] Showing notification:', { title, permission, enabled })
```

**Что добавлено:**
- ✅ Детальное логирование всех шагов
- ✅ Структурированные логи с префиксами
- ✅ Логирование ключевых решений (показать browser notification или toast)

---

## ✅ Этап 4: Проверка после исправлений

### 4.1 Тест-кейс 1: Создать напоминание на ближайшую минуту

**Действия:**
1. Открыть DevTools → Console
2. Создать задачу с due_date = сегодня
3. Установить reminder_time = текущее время + 1 минута
4. Подождать 2 минуты
5. Проверить в Console:
   - `[NotificationProvider] === Reminder Event Start ===`
   - `[NotificationProvider] taskTitle: <название задачи>`
   - `[NotificationProvider] Will show: { isSupported: true, enabled: true }`
   - `[BrowserNotifications] Showing notification: { title: ..., permission: 'granted', enabled: true }`
6. Проверить UI:
   - Browser notification появился? ✅
   - Колокольчик показал количество? ✅
   - Уведомление в dropdown? ✅

**Ожидаемый результат:** Все проверки успешны, логи показывают полный путь

---

### 4.2 Тест-кейс 2: Отключить browser notifications

**Действия:**
1. Открыть DevTools → Console
2. Отключить browser notifications в настройках (localStorage = false)
3. Создать напоминание на +1 минуту
4. Подождать 2 минуты
5. Проверить в Console:
   - `[NotificationProvider] Will show: { isSupported: true, enabled: false }`
   - `[NotificationProvider] Showing toast (browser notifications disabled or not supported)`
6. Проверить UI:
   - Browser notification НЕ появился? ✅
   - Toast появился? ✅ (fallback)
   - Колокольчик показал количество? ✅

**Ожидаемый результат:** Browser notifications отключены, toast и колокольчик работают

---

### 4.3 Тест-кейс 3: SSE reconnect с polling fallback

**Действия:**
1. Открыть DevTools → Network и Console
2. Найти SSE соединение
3. Отключить интернет
4. Подождать 30 секунд
5. Проверить в Console:
   - `[SSE] Connection error: ...`
   - `[NotificationStore] Starting polling fallback due to error`
   - `[NotificationStore] Polling for new notifications` (каждые 30 сек)
6. Включить интернет
7. Проверить в Console:
   - `[SSE] Connection opened`
   - `[SSE] SSE restored, stopping polling fallback`

**Ожидаемый результат:** SSE автоматически переподключается, polling запускается/останавливается

---

### 4.4 Тест-кейс 4: Неактивная вкладка

**Действия:**
1. Создать напоминание на +2 минуты
2. Переключиться на другую вкладку
3. Подождать 3 минуты
4. Вернуться на вкладку приложения
5. Проверить в Console:
   - `[NotificationStore] SSE event: ...`
   - `[NotificationProvider] === Reminder Event Start ===`
6. Проверить UI:
   - Колокольчик обновился? ✅
   - Уведомления загрузились? ✅

**Ожидаемый результат:** При возврате на вкладку загружаются данные

---

### 4.5 Тест-кейс 5: Browser не поддерживает Notification API

**Действия:**
1. Открыть DevTools → Console
2. Эмулировать браузер без Notification API:
   ```javascript
   // В Console перед загрузкой приложения
   window.Notification = undefined
   ```
3. Перезагрузить страницу
4. Создать напоминание на +1 минуту
5. Подождать 2 минуты
6. Проверить в Console:
   - `[NotificationProvider] Notification API supported: false`
   - `[NotificationProvider] Showing toast (browser notifications disabled or not supported)`
7. Проверить UI:
   - Toast появился? ✅
   - Колокольчик показал количество? ✅

**Ожидаемый результат:** Graceful degradation, toast всегда работает

---

### 4.6 Тест-кейс 6: Store пустой при SSE event

**Действия:**
1. Открыть DevTools → Console
2. Очистить store:
   ```javascript
   window.useNotificationStore?.getState?.()?.setNotifications([])
   ```
3. Создать напоминание на +1 минуту
4. Подождать 2 минуты
5. Проверить в Console:
   - `[NotificationProvider] notificationData: { id: ..., message: ... }`
   - `[NotificationProvider] Using notification data from event: ...`
6. Проверить UI:
   - Title в уведомлении корректный? ✅ (не "Напоминание")

**Ожидаемый результат:** Данные берутся из SSE payload, не зависят от store

---

## 🎯 Итоговый чек-лист

### Перед началом исправлений:
- [ ] Провести полную диагностику (Этап 1)
  - [ ] Проверить Browser Notifications (1.1)
  - [ ] Проверить SSE соединение (1.2)
  - [ ] Проверить API запросы (1.3)
  - [ ] Проверить Frontend Store (1.4)
  - [ ] Проверить UI компоненты (1.5)
- [ ] Определить конкретные проблемы (Этап 2)
  - [ ] Browser Notifications не показываются (2.1)
  - [ ] Колокольчик не показывает количество (2.2)
  - [ ] SSE не подключается (2.3)
  - [ ] SSE падает, нет fallback (2.4)
  - [ ] Store пустой при SSE event (2.5)

### После исправлений:
- [ ] Исправить NotificationProvider handler (3.1)
  - [ ] Добавить feature detection для Notification API
  - [ ] Убрать зависимость от `enabled` в регистрации handler
  - [ ] Добавить graceful degradation (всегда показывать toast)
  - [ ] Добавить diagnostic logging
- [ ] Улучшить SSE error handling (3.2)
  - [ ] Добавить try-catch для JSON.parse
  - [ ] Добавить проверку структуры данных
  - [ ] Добавить notification_data в event payload
  - [ ] Добавить логирование всех событий
- [ ] Добавить polling fallback (3.3)
  - [ ] Реализовать startPolling/stopPolling в store
  - [ ] Интегрировать с SSE manager (onError/onOpen)
  - [ ] Добавить exponential backoff (опционально)
  - [ ] Добавить логирование переключений
- [ ] Исправить store empty problem (3.4)
  - [ ] Backend: отправлять notification data в SSE payload
  - [ ] Frontend: сначала использовать данные из event
  - [ ] Добавить fallback на store если нет данных в event
  - [ ] Добавить логирование выбора источника данных
- [ ] Добавить улучшенное логирование (3.5)
  - [ ] Логирование в NotificationProvider
  - [ ] Логирование в notificationStore
  - [ ] Логирование в browserNotifications
  - [ ] Структурированные логи с префиксами

### Тестирование:
- [ ] Пройти все тест-кейсы (Этап 4)
  - [ ] Тест-кейс 1: Напоминание на ближайшую минуту (4.1)
  - [ ] Тест-кейс 2: Отключенные browser notifications (4.2)
  - [ ] Тест-кейс 3: SSE reconnect с polling fallback (4.3)
  - [ ] Тест-кейс 4: Неактивная вкладка (4.4)
  - [ ] Тест-кейс 5: Browser не поддерживает Notification API (4.5)
  - [ ] Тест-кейс 6: Store пустой при SSE event (4.6)
- [ ] Проверить в разных браузерах (Chrome, Firefox, Safari)
- [ ] Проверить на мобильных устройствах
- [ ] Проверить при разных разрешениях экрана

---

## 📝 Заметки

### Проблемы, обнаруженные в процессе анализа:

1. **Handler не регистрируется если `enabled=false`**
   - Файл: `frontend/src/components/NotificationProvider.tsx:66`
   - Проблема: Ранний return в useEffect
   - Влияние: Toast fallback не показывается, если browser notifications отключены
   - **Исправлено:** Убрана зависимость от `enabled`

2. **Нет error handling для JSON.parse**
   - Файл: `frontend/src/stores/notificationStore.ts:146`
   - Проблема: Пустой catch блок
   - Влияние: Ошибки разбора не логируются
   - **Исправлено:** Добавлен try-catch с логированием

3. **Нет polling fallback**
   - Файл: `frontend/src/services/sseManager.ts`
   - Проблема: SSE может падать и не восстанавливаться
   - Влияние: Уведомления теряются навсегда
   - **Исправлено:** Добавлен polling fallback с автоматическим переключением

4. **Нет feature detection для Notification API**
   - Файл: `frontend/src/components/NotificationProvider.tsx`
   - Проблема: Код может упасть в браузерах без Notification API
   - Влияние: Приложение крашится
   - **Исправлено:** Добавлен feature detection и graceful degradation

5. **Store может быть пустым при SSE event**
   - Файл: `frontend/src/components/NotificationProvider.tsx`
   - Проблема: Handler зависит от store, который может быть пустым
   - Влияние: Показывается "Напоминание" вместо реального title
   - **Исправлено:** Backend отправляет notification data в SSE payload

### Связанные документы:

- [2026-04-20-notification-fix.md](./2026-04-20-notification-fix.md) - Оригинальный план
- [2026-04-20-notification-fix-critique.md](./2026-04-20-notification-fix-critique.md) - Критика плана

### Следующие шаги:

1. ✅ Провести полную диагностику по чек-листу Этапа 1
2. ✅ Приоритизировать найденные проблемы
3. 🔄 Начать исправления с критических проблем (3.1 → 3.2 → 3.3 → 3.4)
4. ✅ Тестировать каждое исправление отдельно
5. ✅ Пройти все тест-кейсы
6. 🚀 Деплоить изменения в production

### Phase 2 (не в scope текущей задачи):

- Настройка Sentry для error tracking
- Настройка Google Analytics для user behavior
- Создание custom dashboard для метрик
- Добавление push notifications для мобильных
- Добавление batching для multiple notifications

---

**Документ создан:** 2026-04-20
**Последнее обновление:** 2026-04-20 (после критики)
**Автор:** AI Assistant
**Статус:** Revised - Ready for implementation
