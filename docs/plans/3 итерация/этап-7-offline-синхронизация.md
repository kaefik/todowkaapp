# Этап 7 — Offline синхронизация (Вариант 2: Оптимальный)

## Цель
Полнофункциональная офлайн синхронизация с автоматическим сохранением мутаций, background sync через service worker и real-time обновлениями через SSE.

## Статус реализации

### ✅ Уже реализовано:
- **7.1 useOfflineQueue хук** — IndexedDB для хранения мутаций с timestamp, функции: `queueMutation`, `syncQueue`, `clearQueue`, состояния: `isOnline`, `queueSize`, `isSyncing`, авто-синхронизация при восстановлении сети
- **7.4 SyncIndicator компонент** — визуальный индикатор статуса (online/offline/syncing/pending) с количеством ожидаемых изменений и анимацией

### ❌ Не реализовано (критично):
- **7.2 Service Worker** — файл существует (`frontend/src/sw.ts`), но только обрабатывает `notificationclick`, нет sync event handler и background sync API
- **7.3 API клиент** — `httpClient` не интегрирован с `useOfflineQueue`, при network error просто выкидывает ошибку, нет автоматического сохранения в offline queue, нет индикатора online/offline, нет автоматического processQueue при reconnect
- **7.5 SSE интеграция** — sync stream существует на бэкенде (`/api/sse/sync`), но фронтенд НЕ подписывается на sync stream, нет обновления локального store при SSE событиях, нет refetch данных при изменениях

---

## Детальный план реализации

### 7.2 Service Worker Sync Handler

**Файл:** `frontend/src/sw.ts`

#### Задачи:
1. Добавить `sync` event listener для обработки background sync
2. При событии sync — вызвать `self.clients.matchAll()` для доступа к клиентам
3. Отправить сообщение в client для запуска `syncQueue()`
4. Добавить обработку ошибок и retry логику

#### Реализация:
```typescript
// frontend/src/sw.ts

// Обработчик background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      (async () => {
        try {
          const clients = await self.clients.matchAll({ type: 'window' })
          if (clients.length > 0) {
            await clients[0].postMessage({ type: 'SYNC_QUEUE' })
          }
        } catch (error) {
          console.error('Background sync error:', error)
          // Retry registration
          await self.registration.sync.register('sync-queue')
        }
      })()
    )
  }
})
```

#### Integration:
- При registration sync в `useOfflineQueue.ts` — вызвать `navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-queue'))`
- Message handler в `useOfflineQueue.ts` — прослушивать `SYNC_QUEUE` и вызывать `syncQueue()`

---

### 7.3 API клиент для офлайн режима

**Файл:** `frontend/src/api/httpClient.ts`

#### Задачи:
1. Перехват TypeError (network error) в fetch wrapper
2. При network error — вызывать `queueMutation()` из `useOfflineQueue`
3. Добавить прослушивание online/offline событий
4. При reconnect — вызывать `syncQueue()`
5. Добавить toast уведомления о синхронизации
6. Добавить индикатор online/offline (можно использовать `useOfflineQueue.isOnline`)

#### Реализация:
```typescript
// frontend/src/api/httpClient.ts

import { toast } from 'react-hot-toast'
import type { Mutation } from '../hooks/useOfflineQueue'

// Глобальная функция для сохранения мутаций (будет инициализирована в useOfflineQueue)
let queueMutationFn: ((mutation: Mutation) => Promise<void>) | null = null

export const setQueueMutationFn = (fn: typeof queueMutationFn) => {
  queueMutationFn = fn
}

// Обновление fetch wrapper для перехвата ошибок
async function fetchWrapper(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }))
      throw new ApiError(error.detail || 'Unknown error', response.status)
    }
    return response.json()
  } catch (error) {
    // Перехват network error (TypeError)
    if (error instanceof TypeError && queueMutationFn) {
      const mutation: Mutation = {
        id: crypto.randomUUID(),
        method: options.method || 'GET',
        url,
        body: options.body as string,
        timestamp: Date.now(),
        retryCount: 0
      }

      await queueMutationFn(mutation)
      toast.error('Офлайн режим: запрос сохранен')
      throw new OfflineQueueError('Request saved to offline queue')
    }
    throw error
  }
}

// Online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    toast.success('Сеть восстановлена')
    // Trigger sync через useOfflineQueue
    window.dispatchEvent(new CustomEvent('ONLINE_RECONNECT'))
  })

  window.addEventListener('offline', () => {
    toast.error('Вы офлайн')
  })
}
```

#### Integration в useOfflineQueue:
```typescript
// frontend/src/hooks/useOfflineQueue.ts

useEffect(() => {
  // Инициализация queueMutationFn для httpClient
  setQueueMutationFn(queueMutation)

  // Прослушивание события reconnect
  const handleReconnect = () => {
    syncQueue()
  }

  window.addEventListener('ONLINE_RECONNECT', handleReconnect)
  return () => window.removeEventListener('ONLINE_RECONNECT', handleReconnect)
}, [])
```

---

### 7.5 SSE интеграция в sync handler

**Файл:** `frontend/src/stores/notificationStore.ts` (или новый `syncStore.ts`)

#### Задачи:
1. Создать подписку на `/api/sse/sync` через `useSSE` хук
2. При получении SSE события — обновлять локальный store
3. Trigger refetch данных при изменениях
4. Показывать уведомление об обновлении (toast)

#### Реализация:
```typescript
// frontend/src/stores/syncStore.ts

import { create } from 'zustand'
import { useSSE } from '../hooks/useSSE'

interface SyncState {
  lastSyncAt: number | null
  pendingUpdates: number
  isConnected: boolean
  updateLastSync: () => void
  incrementPending: () => void
  decrementPending: () => void
  setConnected: (connected: boolean) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  lastSyncAt: null,
  pendingUpdates: 0,
  isConnected: false,
  updateLastSync: () => set({ lastSyncAt: Date.now() }),
  incrementPending: () => set((state) => ({ pendingUpdates: state.pendingUpdates + 1 })),
  decrementPending: () => set((state) => ({ pendingUpdates: Math.max(0, state.pendingUpdates - 1) })),
  setConnected: (connected) => set({ isConnected: connected })
}))

// Хук для подписки на SSE sync stream
export function useSyncSSE(userId: string) {
  const { subscribeToSync } = useSSE()

  useEffect(() => {
    const unsubscribe = subscribeToSync(
      userId,
      (message) => {
        console.log('SSE sync event:', message)

        // Update local store
        useSyncStore.getState().updateLastSync()

        // Trigger refetch данных в зависимости от типа события
        if (message.type === 'task_updated' || message.type === 'task_created') {
          // Trigger refetch в taskStore
          useTaskStore.getState().refetchTasks()
        } else if (message.type === 'notification_created') {
          // Trigger refetch в notificationStore
          useNotificationStore.getState().refetchNotifications()
        }

        // Показать toast
        toast.success('Данные синхронизированы')
      },
      (error) => {
        console.error('SSE sync error:', error)
        useSyncStore.getState().setConnected(false)
        toast.error('Ошибка синхронизации')
      }
    )

    useSyncStore.getState().setConnected(true)

    return unsubscribe
  }, [userId, subscribeToSync])
}
```

#### Integration в AppLayout:
```typescript
// frontend/src/components/AppLayout.tsx

import { useSyncSSE } from '../stores/syncStore'

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()

  // Подписка на SSE sync stream
  if (user) {
    useSyncSSE(user.id)
  }

  return (
    // ...
  )
}
```

#### Обновление taskStore для refetch:
```typescript
// frontend/src/stores/taskStore.ts

interface TaskState {
  tasks: Task[]
  refetchTasks: () => Promise<void>
  // ... другие поля
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  refetchTasks: async () => {
    const tasks = await fetchTasks()
    set({ tasks })
  },
  // ...
}))
```

---

## Порядок реализации

### Шаг 1: Интеграция httpClient с useOfflineQueue (2-3 часа)
1. Добавить `queueMutationFn` в `httpClient.ts`
2. Перехват TypeError в `fetchWrapper`
3. Вызов `queueMutationFn` при network error
4. Добавить toast уведомления
5. Инициализация `setQueueMutationFn` в `useOfflineQueue.ts`
6. Добавить event listeners для online/offline
7. Trigger `syncQueue` при reconnect

### Шаг 2: Service Worker Sync Handler (1 час)
1. Добавить `sync` event listener в `sw.ts`
2. Отправка сообщения в client для запуска `syncQueue()`
3. Добавить registration sync в `useOfflineQueue.ts` при queue mutation
4. Добавить message handler в `useOfflineQueue.ts`

### Шаг 3: SSE Integration (1-2 часа)
1. Создать `syncStore.ts` с состоянием синхронизации
2. Создать `useSyncSSE` хук для подписки на `/api/sse/sync`
3. Добавить refetch методы в `taskStore` и `notificationStore`
4. Интегрировать `useSyncSSE` в `AppLayout.tsx`
5. Добавить toast уведомления при sync событиях

### Шаг 4: Тестирование (1 час)
1. Офлайн режим → создать задачу → проверить сохранение в IndexedDB
2. Онлайн → проверить автоматическую синхронизацию
3. Background sync → проверить через DevTools (Network → Offline → Online)
4. SSE sync → изменить задачу в другом браузере → проверить обновление
5. Проверить работу SyncIndicator компонента

---

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `frontend/src/api/httpClient.ts` | Перехват network error, integration с useOfflineQueue, toast уведомления |
| `frontend/src/hooks/useOfflineQueue.ts` | Инициализация queueMutationFn, message handler, registration sync |
| `frontend/src/sw.ts` | Добавить sync event listener |
| `frontend/src/stores/syncStore.ts` | Новый файл — состояние синхронизации |
| `frontend/src/stores/taskStore.ts` | Добавить refetch метод |
| `frontend/src/stores/notificationStore.ts` | Добавить refetch метод |
| `frontend/src/components/AppLayout.tsx` | Интегрировать useSyncSSE |

---

## Проверочный список завершения этапа 7

### Функциональность
- [ ] При network error мутация сохраняется в IndexedDB
- [ ] При reconnect автоматически запускается синхронизация
- [ ] Toast уведомления показываются (offline/reconnect/sync)
- [ ] Background sync работает через service worker
- [ ] SSE sync stream подписка работает
- [ ] При SSE событиях данные автоматически обновляются (refetch)
- [ ] SyncIndicator показывает корректный статус

### Техническое качество
- [ ] Линтинг `npm run lint` без ошибок
- [ ] Type checking `npx tsc --noEmit` без ошибок
- [ ] Нет утечек памяти (корректная очистка event listeners)
- [ ] Обработка ошибок (SSE reconnect, sync retry)

---

## Оценка времени

| Шаг | Оценка времени |
|-----|----------------|
| Шаг 1: httpClient + useOfflineQueue | 2-3 часа |
| Шаг 2: Service Worker | 1 час |
| Шаг 3: SSE Integration | 1-2 часа |
| Шаг 4: Тестирование | 1 час |
| **Итого** | **5-7 часов** |

---

## Известные ограничения

### Текущие ограничения (Вариант 2):
1. **Нет оптимистичных обновлений** — UI не обновляется ДО успешного ответа
2. **Нет конфликтного разрешения** — используется last write wins
3. **Нет merge strategy** — нет умного слияния изменений

### Future improvements (Вариант 3):
1. Оптимистичные обновления — UI обновляется немедленно
2. Conflict resolution — ручное разрешение коллизий
3. Merge strategy — умное слияние на основе timestamp и diff
4. Undo/redo — возможность отменить изменения из offline queue

---

## Ссылки

- [Основной план итерации 3](./план.md)
- [Критический анализ плана](./проблемы-плана.md)
- [Features documentation](../../features.md)
