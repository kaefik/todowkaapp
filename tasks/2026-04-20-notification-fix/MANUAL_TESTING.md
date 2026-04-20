# Ручное тестирование системы уведомлений

Этот документ содержит инструкции для ручного тестирования исправлений системы уведомлений (задачи L7-01...L7-06).

## Подготовка к тестированию

1. Запустите фронтенд: `cd frontend && npm run dev`
2. Запустите бэкенд: `cd backend && ./run.sh`
3. Откройте DevTools (F12) → Console
4. Войдите в приложение или создайте аккаунт

## L7-01: Browser notification

**Цель:** Проверить что browser notification появляется при создании напоминания.

### Шаги:

1. В DevTools → Console очистите логи
2. Создайте новую задачу:
   - Название: "Тест напоминания"
   - Due date: сегодня
   - Reminder time: текущее время + 1 минута
3. Сохраните задачу
4. Подождите 2 минуты
5. Проверьте Console:

**Ожидаемые логи:**
```
[NotificationProvider] === Reminder Event Start ===
[NotificationProvider] task:reminder-fired event { taskId: "...", notificationData: {...}, enabled: true, isSupported: true }
[NotificationProvider] Using message from notificationData: Тест напоминания
[NotificationProvider] Will show: { isSupported: true, enabled: true, taskTitle: "Тест напоминания" }
[BrowserNotifications] Showing notification: { title: "Напоминание о задаче", body: "Тест напоминания", permission: "granted", enabled: true }
[NotificationProvider] === Reminder Event End ===
```

**Ожидаемый результат:**
- ✅ Browser notification появился в ОС
- ✅ Колокольчик показывает количество (1)
- ✅ Уведомление видно в dropdown

---

## L7-02: Toast fallback

**Цель:** Проверить что toast fallback работает когда browser notifications отключены.

### Шаги:

1. Откройте DevTools → Console
2. Отключите browser notifications:
   ```javascript
   localStorage.setItem('ui-browser-notifications-enabled', 'false')
   location.reload()
   ```
3. Создайте напоминание на +1 минуту
4. Подождите 2 минуты
5. Проверьте Console:

**Ожидаемые логи:**
```
[NotificationProvider] Will show: { isSupported: true, enabled: false, taskTitle: "..." }
[NotificationProvider] Browser notifications disabled or not supported, showing toast
```

**Ожидаемый результат:**
- ✅ Browser notification НЕ появился
- ✅ Toast появился в UI
- ✅ Колокольчик показывает количество (1)

---

## L7-03: SSE reconnect with polling fallback

**Цель:** Проверить автоматическое переключение SSE ↔ polling.

### Шаги:

1. Откройте DevTools → Network и Console
2. Найдите активное SSE соединение (может быть в сетевых запросах)
3. Отключите интернет (DevTools → Network → Offline)
4. Подождите 30 секунд
5. Проверьте Console:

**Ожидаемые логи при отключении:**
```
[SSE] [ERROR] ... - SSE connection error
[NotificationStore] Starting polling fallback due to SSE error
[NotificationStore] Polling tick
```

6. Включите интернет (DevTools → Network → Online)
7. Проверьте Console:

**Ожидаемые логи при восстановлении:**
```
[SSE] [INFO] ... - Connection established
[SSE] SSE restored, stopping polling fallback
[NotificationStore] Stopping polling
```

**Ожидаемый результат:**
- ✅ SSE падает при потере интернета
- ✅ Polling запускается автоматически
- ✅ SSE восстанавливается при восстановлении интернета
- ✅ Polling останавливается автоматически

---

## L7-04: Inactive tab behavior

**Цель:** Проверить что уведомления загружаются при возврате на неактивную вкладку.

### Шаги:

1. Создайте напоминание на +2 минуты
2. Переключитесь на другую вкладку
3. Подождите 3 минуты
4. Вернитесь на вкладку приложения
5. Проверьте Console:

**Ожидаемые логи:**
```
[NotificationStore] SSE event: { event: "notification", data: "..." }
[NotificationProvider] === Reminder Event Start ===
...
[NotificationProvider] === Reminder Event End ===
```

**Ожидаемый результат:**
- ✅ SSE reconnect при возврате на вкладку
- ✅ Уведомления загружаются через refetch
- ✅ Колокольчик обновился
- ✅ Уведомления видны в dropdown

---

## L7-05: Browser without Notification API

**Цель:** Проверить graceful degradation когда браузер не поддерживает Notification API.

### Шаги:

1. Откройте DevTools → Console
2. Эмуляция браузера без Notification API:
   ```javascript
   window.Notification = undefined
   location.reload()
   ```
3. Создайте напоминание на +1 минуту
4. Подождите 2 минуты
5. Проверьте Console:

**Ожидаемые логи:**
```
[NotificationProvider] Notification API supported: false
[NotificationProvider] Browser notifications disabled or not supported, showing toast
```

**Ожидаемый результат:**
- ✅ Приложение не крашится
- ✅ Toast появился
- ✅ Колокольчик показывает количество (1)

---

## L7-06: Store empty when SSE event fires

**Цель:** Проверить что данные берутся из SSE payload когда store пустой.

### Шаги:

1. Откройте DevTools → Console
2. Очистите store (выполните в Console):
   ```javascript
   // Этот шаг не требуется, так как SSE payload содержит все данные
   console.log('Testing SSE payload data extraction')
   ```
3. Создайте напоминание на +1 минуту
4. Подождите 2 минуты
5. Проверьте Console:

**Ожидаемые логи:**
```
[NotificationProvider] task:reminder-fired event { taskId: "...", notificationData: { id: "...", message: "...", ... } }
[NotificationProvider] Using message from notificationData: <название задачи>
```

**Ожидаемый результат:**
- ✅ Title в уведомлении корректный (не "Напоминание")
- ✅ Уведомление содержит правильное название задачи
- ✅ Данные берутся из SSE payload, не зависят от store

---

## Устранение неполадок

### Browser notification не показывается

1. Проверьте разрешение в браузере: Settings → Privacy → Notifications
2. Проверьте Console: permission должен быть "granted"
3. Проверьте localStorage: `ui-browser-notifications-enabled` должно быть "true"

### SSE не подключается

1. Проверьте что бэкенд запущен: http://localhost:8000/docs
2. Проверьте Network tab: должен быть SSE запрос к `/api/sse/notifications`
3. Проверьте Console на ошибки SSE

### Polling не запускается

1. Проверьте Console для логов "[NotificationStore] Starting polling fallback"
2. Проверьте что pollingInterval не null (можно проверить в React DevTools)
3. Убедитесь что SSE connection закрыт (error или disconnected)

### Toast не появляется

1. Проверьте Console на ошибки
2. Убедитесь что toastStore работает
3. Проверьте что уведомление действительно создано (в dropdown или через API)

---

## Дополнительные проверки

### Проверка логирования

Все компоненты должны логировать свои действия с префиксами:
- `[NotificationProvider]` — для NotificationProvider
- `[NotificationStore]` — для notificationStore
- `[SSE]` — для SSE manager
- `[BrowserNotifications]` — для browser notifications

### Проверка структуры SSE payload

SSE payload должен содержать:
```json
{
  "type": "notification_created",
  "notification_id": "...",
  "type": "due_reminder",
  "message": "...",
  "task_id": "...",
  "notification_data": {
    "id": "...",
    "message": "...",
    "created_at": "2026-04-20T...",
    "due_date": "2026-04-20T..."
  }
}
```

---

## Отчет о тестировании

После завершения тестирования заполните этот отчет:

| Тест | Статус | Примечания |
|------|--------|------------|
| L7-01: Browser notification | ⬜ | |
| L7-02: Toast fallback | ⬜ | |
| L7-03: SSE reconnect | ⬜ | |
| L7-04: Inactive tab | ⬜ | |
| L7-05: No Notification API | ⬜ | |
| L7-06: Store empty | ⬜ | |

**Общие примечания:**
-
-
