# Тестирование офлайн-редактирования задач

## Инструкции по тестированию

### Сценарий 1: Редактирование задачи офлайн с перезагрузкой страницы

1. **Подготовка:**
   - Запустите фронтенд: `cd frontend && npm run dev`
   - Запустите бэкенд: `cd backend && ./run.sh`
   - Откройте приложение в браузере (http://localhost:5178)
   - Войдите в систему
   - Создайте тестовую задачу (например, "Тестовая задача")

2. **Тестирование:**
   - Остановите бэкенд (Ctrl+C в терминале бэкенда)
   - Откройте созданную задачу для редактирования
   - Измените описание задачи на "Тестовое описание офлайн"
   - Нажмите "Save"
   - Откройте консоль браузера (F12)
   - Проверьте логи:
     ```
     [updateTaskMutation] Starting update for task: xxx with data: { description: "Тестовое описание офлайн" }
     [localTaskChanges] Setting local change for task: xxx changes: { description: "Тестовое описание офлайн" }
     [localTaskChanges] Local change saved successfully for task: xxx
     [updateTaskMutation] Local changes saved to IndexedDB
     ```
   - Закройте модальное окно
   - **Перезагрузите страницу (F5)**
   - Откройте ту же задачу
   - **Ожидаемый результат:** описание должно быть "Тестовое описание офлайн"
   - Проверьте логи:
     ```
     [useTask] Task data changed: { id: "xxx", hasTask: true }
     [localTaskChanges] Getting local change for task: xxx
     [localTaskChanges] Local change found for task: xxx result: { ... }
     [useTask] Local changes for task: xxx { ... }
     [useTask] Merged task: { description: "Тестовое описание офлайн", ... }
     ```

3. **Синхронизация:**
   - Запустите бэкенд снова: `cd backend && ./run.sh`
   - Дождитесь сообщения "Сеть восстановлена" или "Синхронизация..."
   - Проверьте логи:
     ```
     [updateTaskMutation] Update successful, clearing local changes for task: xxx
     ```
   - Перезагрузите страницу
   - Откройте задачу
   - **Ожидаемый результат:** описание должно быть "Тестовое описание офлайн"

### Сценарий 2: Использование инструмента отладки

1. **Показать все локальные изменения:**
   ```
   window.localTaskDebug.getAll()
   ```
   Ожидаемый результат: таблица с локальными изменениями

2. **Показать изменения для конкретной задачи:**
   ```
   window.localTaskDebug.get('task-id')
   ```
   Замените 'task-id' на ID задачи

3. **Очистить все локальные изменения:**
   ```
   window.localTaskDebug.clearAll()
   ```

4. **Очистить изменения для конкретной задачи:**
   ```
   window.localTaskDebug.clear('task-id')
   ```

### Сценарий 3: Несколько изменений офлайн

1. Остановите бэкенд
2. Создайте 3-4 новые задачи
3. Отредактируйте несколько существующих задач
4. Перезагрузите страницу
5. **Ожидаемый результат:** все изменения должны быть видны
6. Запустите бэкенд
7. Дождитесь синхронизации
8. Перезагрузите страницу
9. **Ожидаемый результат:** все изменения должны быть синхронизированы

## Диагностика проблем

### Проблема: Изменения не сохраняются после перезагрузки

**Проверьте в консоли:**
1. Есть ли логи `[updateTaskMutation]` при сохранении?
2. Есть ли логи `[localTaskChanges]` при сохранении?
3. Есть ли логи `Local change saved successfully`?
4. Есть ли логи `[useTask]` при загрузке задачи?
5. Есть ли логи `Local change found` при загрузке задачи?

**Используйте инструмент отладки:**
```javascript
window.localTaskDebug.getAll()
```
Должна быть таблица с локальными изменениями.

### Проблема: Индикатор "🔌 Офлайн" не появляется

**Проверьте:**
1. Бэкенд действительно остановлен?
2. Откройте DevTools → Network → "Offline" режим
3. Перезагрузите страницу

### Проблема: Изменения синхронизируются, но потом исчезают

**Проверьте логи:**
1. Есть ли лог `[updateTaskMutation] Update successful`?
2. Есть ли лог `clearing local changes for task`?

**Возможная причина:** Бэкенд не сохраняет изменения. Проверьте логи бэкенда.

## Логи для диагностики

### При сохранении задачи офлайн:
```
[updateTaskMutation] Starting update for task: xxx
[localTaskChanges] Setting local change for task: xxx
[localTaskChanges] Local change saved successfully
[updateTaskMutation] Local changes saved to IndexedDB
[OfflineQueue] Queuing mutation: { method: "PUT", url: "/tasks/xxx" }
[OfflineQueue] Update queued, keeping local changes
```

### При загрузке задачи офлайн:
```
[useTask] Task data changed: { id: "xxx", hasTask: true }
[localTaskChanges] Getting local change for task: xxx
[localTaskChanges] Local change found for task: xxx
[useTask] Local changes for task: xxx { changes: { description: "..." } }
[useTask] Merged task: { description: "...", ... }
```

### При синхронизации:
```
[OfflineQueue] Syncing queue...
[OfflineQueue] Successfully synced mutation: PUT /tasks/xxx
[updateTaskMutation] Update successful, clearing local changes for task: xxx
[OfflineQueue] All mutations synced, cleared local task changes
```

## Известные проблемы

1. **Редкий кейс:** Если пользователь закрывает браузер сразу после нажатия "Save", но до сохранения в IndexedDB, изменения могут быть потеряны.
   - **Решение:** Добавить подтверждение перед закрытием (не реализовано)

2. **Конфликт изменений:** Если задача была изменена на другом устройстве, локальные изменения могут перезаписать удаленные изменения.
   - **Решение:** Добавить merge-стратегию (не реализовано)

## Полезные команды

```javascript
// Показать все задачи в React Query кеше
window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__.getClient().getQueryCache().getAll()

// Показать офлайн-очередь
window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__.getClient().getMutationCache().getAll()

// Очистить React Query кеш
window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__.getClient().clear()

// Проверить IndexedDB
indexedDB.open('todowka-local-changes').then(db => {
  const tx = db.transaction('local_task_changes', 'readonly')
  tx.objectStore('local_task_changes').getAll().onsuccess = (e) => {
    console.table(e.target.result)
  }
})
```
