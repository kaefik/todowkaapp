# Оптимизация синхронизации — устранение UI-лага

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить торможение UI после каждой операции путём устранения эхо-цикла push→SSE→pull, оптимизации pull, маппинга и индикатора статуса.

**Architecture:** Local-first приложение на Dexie/IndexedDB. Push отправляет мутации на сервер, сервер рассылает SSE-событие, SyncProvider ловит его и делает полный pull всех 7 ресурсов. Этот эхо-цикл — главная причина лагов. Исправляем: (1) подавление эха после собственного push, (2) инкрементальный pull с `updated_since`, (3) выборочный pull по типу ресурса из SSE, (4) batch-маппинг задач, (5) корректный статус светофора.

**Tech Stack:** TypeScript, React, Dexie, FastAPI, SQLAlchemy, SSE

---

## Task 1: Подавление эхо-цикла после собственного push

**Files:**
- Modify: `frontend/src/components/SyncProvider.tsx`

Добавляем механизм `pushEchoSuppression`: после push записываем таймстемп и набор entityType+entityId. При получении SSE-события, если оно попадает в "эхо-окно" (5 сек после push) и entityType совпадает — пропускаем pull.

- [ ] **Step 1: Добавить эхо-подавление в SyncProvider.tsx**

В `SyncProvider.tsx` после строк с глобальными переменными (строка 14-17), добавить:

```typescript
let pushEchoEntities = new Map<string, number>()
const PUSH_ECHO_WINDOW_MS = 5000

function markPushEcho(entityType: string, entityId: string) {
  pushEchoEntities.set(`${entityType}:${entityId}`, Date.now())
}

function isPushEcho(entityType: string): boolean {
  const now = Date.now()
  for (const [key, ts] of pushEchoEntities) {
    if (now - ts > PUSH_ECHO_WINDOW_MS) {
      pushEchoEntities.delete(key)
    }
  }
  for (const key of pushEchoEntities.keys()) {
    if (key.startsWith(`${entityType}:`)) return true
  }
  return false
}
```

В функции `schedulePush()` (строка 25), после `await push()`, добавить вызовы `markPushEcho` для каждой отправленной мутации. Для этого модифицируем push чтобы он возвращал список отправленных мутаций:

```typescript
function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    if (pushingRefGlobal) return
    pushingRefGlobal = true
    updateSyncing()
    try {
      const sent = await push()
      setLastSyncAtFn?.(new Date())
      if (sent) {
        for (const { entityType, entityId } of sent) {
          markPushEcho(entityType, entityId)
        }
      }
    } catch (err) {
      console.warn('[SyncProvider] Debounced push failed:', err)
    } finally {
      pushingRefGlobal = false
      updateSyncing()
    }
  }, PUSH_DEBOUNCE_MS)
}
```

- [ ] **Step 2: Модифицировать push() в syncEngine.ts чтобы возвращал список отправленных сущностей**

В `frontend/src/db/syncEngine.ts`, изменить сигнатуру `push()`:

```typescript
export interface PushedEntity {
  entityType: EntityType
  entityId: string
}

export async function push(): Promise<PushedEntity[]> {
  const userId = useAuthStore.getState().user?.id
  if (!userId) return []

  const allMutations = await db.mutations.orderBy('timestamp').toArray()
  if (allMutations.length === 0) return []

  const { toSend, toDelete } = deduplicateMutations(allMutations)

  for (const id of toDelete) {
    await db.mutations.delete(id)
  }

  const pushedEntities: PushedEntity[] = []
  const groups = new Map<string, typeof toSend>()
  for (const m of toSend) {
    const key = `${m.entityType}:${m.entityId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }

  const groupEntries = [...groups.values()]
  const BATCH_SIZE = 5

  for (let i = 0; i < groupEntries.length; i += BATCH_SIZE) {
    const batch = groupEntries.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(batch.map(group => executeMutationGroup(group)))
  }

  for (const m of toSend) {
    pushedEntities.push({ entityType: m.entityType, entityId: m.entityId })
  }

  return pushedEntities
}
```

- [ ] **Step 3: Обновить doPush в SyncProvider чтобы использовал возвращаемое значение**

В `SyncProvider.tsx`, обновить `doPush`:

```typescript
const doPush = useCallback(async () => {
  if (!userRef.current || pushingRefGlobal) return
  pushingRefGlobal = true
  updateSyncing()
  try {
    const sent = await push()
    if (isMountedRef.current) setLastSyncAt(new Date())
    if (sent) {
      for (const { entityType, entityId } of sent) {
        markPushEcho(entityType, entityId)
      }
    }
  } catch (err) {
    console.warn('[SyncProvider] Push failed:', err)
  } finally {
    pushingRefGlobal = false
    updateSyncing()
  }
}, [])
```

- [ ] **Step 4: Использовать isPushEcho в SyncSSEListener**

Изменить `SyncSSEListener`, чтобы SSE callback передавал тип события и проверял эхо:

В классе `SyncSSEListener` изменить поле `onPull` на `onPull` с параметром:

```typescript
class SyncSSEListener {
  private es: EventSource | null = null
  private retryTimeout: ReturnType<typeof setTimeout> | null = null
  private retryDelay = 2000
  private readonly maxRetryDelay = 30000
  private onPull: ((eventType: string) => void) | null = null

  connect(onPull: (eventType: string) => void) {
    this.disconnect()
    this.onPull = onPull
    this.retryDelay = 2000
    this.open()
  }

  private open() {
    if (this.es) this.es.close()
    this.es = new EventSource('/api/sse/sync', { withCredentials: true })
    this.es.onopen = () => { this.retryDelay = 2000 }

    const events = [
      'task_updated', 'checklist_updated',
      'project_created', 'project_updated', 'project_deleted',
      'area_created', 'area_updated', 'area_deleted',
      'context_created', 'context_updated', 'context_deleted',
      'tag_created', 'tag_updated', 'tag_deleted',
      'verb_template_created', 'verb_template_updated', 'verb_template_deleted',
    ]
    for (const evt of events) {
      this.es!.addEventListener(evt, () => {
        const resourceType = evt.split('_')[0]
        if (!isPushEcho(resourceType)) {
          this.onPull?.(evt)
        }
      })
    }

    this.es.onerror = () => {
      this.es?.close()
      this.es = null
      this.scheduleReconnect()
    }
  }
  // ... scheduleReconnect, disconnect без изменений
}
```

- [ ] **Step 5: Обновить вызов syncSSE.connect в useEffect**

В `useEffect` (строка 207), изменить:

```typescript
syncSSE.connect((eventType: string) => {
  if (userRef.current) schedulePull(userRef.current.id, eventType)
})
```

- [ ] **Step 6: Проверить сборку**

Run: `cd frontend && npx tsc --noEmit`

---

## Task 2: Выборочный pull по типу ресурса из SSE-события

**Files:**
- Modify: `frontend/src/components/SyncProvider.tsx`
- Modify: `frontend/src/db/syncEngine.ts`

Сейчас `pull()` загружает ВСЕ 7 ресурсов при любом SSE-событии. Изменяем на выборочный pull только затронутого ресурса.

- [ ] **Step 1: Добавить функцию selectResourceType в syncEngine.ts**

В `syncEngine.ts`, добавить маппинг из SSE-события в тип ресурса и функцию выборочного pull:

```typescript
export type ResourceType = 'task' | 'project' | 'area' | 'context' | 'tag' | 'verbTemplate' | 'checklistItem'

const SSE_TO_RESOURCE: Record<string, ResourceType> = {
  task_updated: 'task',
  checklist_updated: 'checklistItem',
  project_created: 'project', project_updated: 'project', project_deleted: 'project',
  area_created: 'area', area_updated: 'area', area_deleted: 'area',
  context_created: 'context', context_updated: 'context', context_deleted: 'context',
  tag_created: 'tag', tag_updated: 'tag', tag_deleted: 'tag',
  verb_template_created: 'verbTemplate', verb_template_updated: 'verbTemplate', verb_template_deleted: 'verbTemplate',
}

export function getResourceTypeFromSSE(eventType: string): ResourceType | null {
  return SSE_TO_RESOURCE[eventType] ?? null
}
```

- [ ] **Step 2: Добавить selectivePull в syncEngine.ts**

```typescript
export async function selectivePull(userId: string, resourceTypes: ResourceType[]): Promise<void> {
  const resources = RESOURCES.filter(r => resourceTypes.includes(r.entityType))
  await Promise.all(resources.map(async (resource) => {
    const items = await fetchAllPages(resource.endpoint)
    const serverIds = await mergeAndPut(resource.table, resource.entityType, items, userId, resource.transform)
    await removeServerDeleted(resource.table, resource.entityType, serverIds, userId)
  }))
}
```

- [ ] **Step 3: Обновить schedulePull в SyncProvider.tsx**

Изменить `schedulePull` чтобы принимал опциональный тип ресурса:

```typescript
function schedulePull(userId: string, eventType?: string) {
  if (pullTimer) clearTimeout(pullTimer)
  pullTimer = setTimeout(async () => {
    if (pullingRefGlobal) return
    pullingRefGlobal = true
    updateSyncing()
    try {
      if (eventType) {
        const resourceType = getResourceTypeFromSSE(eventType)
        if (resourceType) {
          await selectivePull(userId, [resourceType])
        } else {
          await pull(userId)
        }
      } else {
        await pull(userId)
      }
      setLastSyncAtFn?.(new Date())
    } catch (err) {
      console.warn('[SyncProvider] Debounced pull failed:', err)
    } finally {
      pullingRefGlobal = false
      updateSyncing()
    }
  }, PULL_DEBOUNCE_MS)
}
```

Добавить импорт в SyncProvider:
```typescript
import { pull, push, selectivePull, getResourceTypeFromSSE } from '../db/syncEngine'
```

- [ ] **Step 4: Обновить вызовы schedulePull**

В SSE callback (из Task 1):
```typescript
syncSSE.connect((eventType: string) => {
  if (userRef.current) schedulePull(userRef.current.id, eventType)
})
```

Периодический pull и онлайн-восстановление остаются без eventType (полный pull):
```typescript
intervalRef.current = setInterval(() => { doPull() }, PULL_INTERVAL)
// И в эффекте isOnline:
doPull() // полный pull
```

- [ ] **Step 5: Проверить сборку**

Run: `cd frontend && npx tsc --noEmit`

---

## Task 3: Инкрементальный pull через updated_since на бэкенде

**Files:**
- Modify: `backend/app/api/tasks.py`
- Modify: `backend/app/api/projects.py`
- Modify: `backend/app/api/areas.py`
- Modify: `backend/app/api/contexts.py`
- Modify: `backend/app/api/tags.py`
- Modify: `backend/app/api/verb_templates.py`
- Modify: `backend/app/api/checklist.py`
- Modify: `backend/app/services/task_service.py`
- Modify: `frontend/src/db/syncEngine.ts`

Добавить параметр `updated_since` во все list-эндпоинты и `fetchAllPages` на фронтенде.

- [ ] **Step 1: Добавить updated_since в task_service.py**

В `backend/app/services/task_service.py`, в метод `get_tasks` добавить параметр:

```python
async def get_tasks(
    self,
    user_id: UUID,
    ...,
    updated_since: datetime | None = None,
) -> tuple[list[Task], int]:
    base_where = [Task.user_id == user_id]
    ...
    if updated_since is not None:
        base_where.append(Task.updated_at >= updated_since)
```

- [ ] **Step 2: Добавить updated_since в tasks.py API**

В `backend/app/api/tasks.py`, в `list_tasks` добавить Query-параметр:

```python
updated_since: str | None = Query(default=None, description="ISO datetime, return only records updated after"),
```

И передачу в сервис:
```python
parsed_updated_since = None
if updated_since:
    parsed_updated_since = dt.fromisoformat(updated_since)

service = TaskService(db)
tasks, total = await service.get_tasks(
    ...,
    updated_since=parsed_updated_since,
)
```

- [ ] **Step 3: Повторить для остальных сервисов и API**

Для каждого ресурса (projects, areas, contexts, tags, verb_templates, checklist):
- Добавить `updated_since: datetime | None = None` в service method
- Добавить фильтр `if updated_since is not None: base_where.append(Model.updated_at >= updated_since)`
- Добавить Query-параметр `updated_since` в API endpoint
- Передать в сервис

- [ ] **Step 4: Обновить fetchAllPages и pull в syncEngine.ts**

В `frontend/src/db/syncEngine.ts`:

```typescript
async function fetchAllPages(
  endpoint: string,
  updatedSince?: string | null
): Promise<Record<string, unknown>[]> {
  const allItems: Record<string, unknown>[] = []
  let offset = 0
  const limit = 100

  while (true) {
    let url = `${endpoint}?limit=${limit}&offset=${offset}`
    if (updatedSince) {
      url += `&updated_since=${encodeURIComponent(updatedSince)}`
    }
    const response = await httpClient.get<{ items: Record<string, unknown>[]; total: number }>(url)
    const { items, total } = response.data
    allItems.push(...items)
    offset += limit
    if (offset >= total) break
  }

  return allItems
}
```

Изменить `selectivePull` и `pull` чтобы передавать `updated_since`:

```typescript
async function getLastSyncedAt(): Promise<string | null> {
  const meta = await db.syncMeta.get('lastPullAt')
  return meta?.value ?? null
}

async function setLastSyncedAt(): Promise<void> {
  await db.syncMeta.put({ key: 'lastPullAt', value: new Date().toISOString() })
}

export async function pull(userId: string): Promise<void> {
  const since = await getLastSyncedAt()
  await Promise.all(RESOURCES.map(async (resource) => {
    const items = await fetchAllPages(resource.endpoint, since)
    const serverIds = await mergeAndPut(resource.table, resource.entityType, items, userId, resource.transform)
    await removeServerDeleted(resource.table, resource.entityType, serverIds, userId)
  }))
  await setLastSyncedAt()
}

export async function selectivePull(userId: string, resourceTypes: ResourceType[]): Promise<void> {
  const since = await getLastSyncedAt()
  const resources = RESOURCES.filter(r => resourceTypes.includes(r.entityType))
  await Promise.all(resources.map(async (resource) => {
    const items = await fetchAllPages(resource.endpoint, since)
    const serverIds = await mergeAndPut(resource.table, resource.entityType, items, userId, resource.transform)
    await removeServerDeleted(resource.table, resource.entityType, serverIds, userId)
  }))
  await setLastSyncedAt()
}
```

- [ ] **Step 5: Проверить бэкенд и фронтенд**

Run: `cd backend && ruff check . && pytest tests/ -v`
Run: `cd frontend && npx tsc --noEmit`

---

## Task 4: Оптимизация dbTaskToUi — batch-запросы вместо N+1

**Files:**
- Modify: `frontend/src/db/mappers.ts`
- Modify: `frontend/src/hooks/useTasks.ts`
- Modify: `frontend/src/hooks/useDueDateTasks.ts`
- Modify: `frontend/src/hooks/useGtdCounts.ts`

Сейчас `dbTaskToUi` вызывается для каждой задачи отдельно, делая 4-5 IndexedDB-запросов. При 100 задачах = 500+ запросов. Изменяем на batch-подход: загружаем все данные за один раз, потом маппим.

- [ ] **Step 1: Создать batch-функцию dbTasksToUiBatch в mappers.ts**

```typescript
export async function dbTasksToUiBatch(tasks: DbTask[]): Promise<UiTask[]> {
  if (tasks.length === 0) return []

  const allTagIds = [...new Set(tasks.flatMap(t => t.tagIds))]
  const allProjectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))] as string[]
  const allContextIds = [...new Set(tasks.map(t => t.contextId).filter(Boolean))] as string[]
  const allAreaIds = [...new Set(tasks.map(t => t.areaId).filter(Boolean))] as string[]
  const allTaskIds = tasks.map(t => t.id)

  const [tagRecords, checklistItems, projects, contexts, areas] = await Promise.all([
    allTagIds.length > 0
      ? db.tags.where('id').anyOf(allTagIds).filter(t => t._syncStatus !== 'deleted').toArray()
      : Promise.resolve([]),
    db.checklistItems.where('taskId').anyOf(allTaskIds).filter(i => i._syncStatus !== 'deleted').toArray(),
    allProjectIds.length > 0
      ? db.projects.where('id').anyOf(allProjectIds).toArray()
      : Promise.resolve([]),
    allContextIds.length > 0
      ? db.contexts.where('id').anyOf(allContextIds).toArray()
      : Promise.resolve([]),
    allAreaIds.length > 0
      ? db.areas.where('id').anyOf(allAreaIds).toArray()
      : Promise.resolve([]),
  ])

  const tagsMap = new Map(tagRecords.map(t => [t.id, t]))
  const projectsMap = new Map(projects.filter(p => p._syncStatus !== 'deleted').map(p => [p.id, p]))
  const contextsMap = new Map(contexts.filter(c => c._syncStatus !== 'deleted').map(c => [c.id, c]))
  const areasMap = new Map(areas.filter(a => a._syncStatus !== 'deleted').map(a => [a.id, a]))

  const checklistByTask = new Map<string, { total: number; completed: number }>()
  for (const item of checklistItems) {
    const existing = checklistByTask.get(item.taskId) ?? { total: 0, completed: 0 }
    existing.total++
    if (item.isCompleted) existing.completed++
    checklistByTask.set(item.taskId, existing)
  }

  return tasks.map(task => {
    const taskTags = task.tagIds
      .map(id => tagsMap.get(id))
      .filter(Boolean)
      .map(t => ({
        id: t!.id, name: t!.name, color: t!.color,
        user_id: t!.userId, created_at: t!.createdAt, updated_at: t!.updatedAt,
      }))

    const p = task.projectId ? projectsMap.get(task.projectId) : null
    const project = p ? { id: p.id, name: p.name, color: p.color, is_active: p.isActive } : null

    const c = task.contextId ? contextsMap.get(task.contextId) : null
    const context = c ? { id: c.id, name: c.name, color: c.color, icon: c.icon } : null

    const a = task.areaId ? areasMap.get(task.areaId) : null
    const area = a ? { id: a.id, name: a.name, color: a.color } : null

    const checklist = checklistByTask.get(task.id) ?? { total: 0, completed: 0 }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.isCompleted,
      gtd_status: task.gtdStatus,
      context_id: task.contextId,
      area_id: task.areaId,
      project_id: task.projectId,
      project,
      context,
      area,
      position: task.position,
      due_date: task.dueDate,
      notes: task.notes,
      recurrence_type: task.recurrenceType,
      recurrence_config: task.recurrenceConfig ? JSON.parse(task.recurrenceConfig) : null,
      recurrence_end_date: task.recurrenceEndDate,
      reminder_time: task.reminderTime,
      reminder_offsets: task.reminderOffsets ? JSON.parse(task.reminderOffsets) : null,
      reminder_fired: task.reminderFired,
      deadline_notified: task.deadlineNotified,
      is_recurring: task.isRecurring,
      tags: taskTags,
      checklist_total: checklist.total,
      checklist_completed: checklist.completed,
      user_id: task.userId,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    }
  })
}
```

- [ ] **Step 2: Обновить useTasks.ts — использовать dbTasksToUiBatch**

В `useTasks.ts` строка 186-188:

```typescript
const { data: rawTasks = [], isLoading } = useDexieQuery(
  async () => {
    if (!user) return []
    const dbRecords = await activeTasks(user.id).toArray()
    const uiTasks = await dbTasksToUiBatch(dbRecords)
    return applyFilters(uiTasks, filters)
  },
  [user?.id]
)
```

Добавить импорт:
```typescript
import { dbTasksToUiBatch } from '../db/mappers'
```

Удалить неиспользуемый импорт `dbTaskToUi` если он остался только для fetchTask/useTask.

- [ ] **Step 3: Обновить useTask (single) — оставить dbTaskToUi**

В `useTask` (строка 413-431) оставить `dbTaskToUi` — для одной задачи N+1 не проблема.

- [ ] **Step 4: Обновить useDueDateTasks.ts — использовать dbTasksToUiBatch**

```typescript
import { dbTasksToUiBatch } from '../db/mappers'
// ...
const uiTasks = await dbTasksToUiBatch(dbRecords)
```

- [ ] **Step 5: Проверить сборку**

Run: `cd frontend && npx tsc --noEmit`

---

## Task 5: Оптимизация useGtdCounts — единый запрос вместо 9

**Files:**
- Modify: `frontend/src/hooks/useGtdCounts.ts`

Сейчас 9 отдельных запросов к IndexedDB. Можно получить все задачи одним запросом и посчитать в памяти.

- [ ] **Step 1: Переписать useGtdCounts на единый запрос**

```typescript
import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useAuthStore } from '../stores/authStore'
import { getDayBounds } from './useDueDateTasks'
import type { GtdStatus } from './useTasks'

export const TASKS_CHANGED_EVENT = 'todowka:tasks-changed'
export function notifyTasksChanged() {}

export interface GtdCounts {
  inbox: number
  active: number
  next: number
  waiting: number
  someday: number
  completed: number
  trash: number
  today: number
  tomorrow: number
}

interface UseGtdCountsReturn {
  counts: GtdCounts
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const defaultCounts: GtdCounts = {
  inbox: 0, active: 0, next: 0, waiting: 0, someday: 0,
  completed: 0, trash: 0, today: 0, tomorrow: 0,
}

export function useGtdCounts(): UseGtdCountsReturn {
  const user = useAuthStore(s => s.user)

  const counts = useLiveQuery(async () => {
    if (!user) return defaultCounts

    const allTasks = await db.tasks
      .where('userId')
      .equals(user.id)
      .filter(t => t._syncStatus !== 'deleted')
      .toArray()

    const result: GtdCounts = { ...defaultCounts }
    const statusMap: Record<string, number> = {}
    for (const t of allTasks) {
      statusMap[t.gtdStatus] = (statusMap[t.gtdStatus] ?? 0) + 1
    }
    result.inbox = statusMap['inbox'] ?? 0
    result.active = statusMap['active'] ?? 0
    result.next = statusMap['next'] ?? 0
    result.waiting = statusMap['waiting'] ?? 0
    result.someday = statusMap['someday'] ?? 0
    result.completed = statusMap['completed'] ?? 0
    result.trash = statusMap['trash'] ?? 0

    const todayBounds = getDayBounds(user.timezone, 0)
    const tomorrowBounds = getDayBounds(user.timezone, 1)

    let todayCount = 0
    let tomorrowCount = 0
    for (const t of allTasks) {
      if (t.isCompleted || !t.dueDate) continue
      if (t.dueDate >= todayBounds.start && t.dueDate <= todayBounds.end) todayCount++
      if (t.dueDate >= tomorrowBounds.start && t.dueDate <= tomorrowBounds.end) tomorrowCount++
    }
    result.today = todayCount
    result.tomorrow = tomorrowCount

    return result
  }, [user?.id], defaultCounts)

  const refetch = useCallback(async () => {}, [])

  return { counts: counts ?? defaultCounts, isLoading: counts === undefined, error: null, refetch }
}

export const GTD_STATUS_LABELS: Record<GtdStatus, string> = {
  inbox: 'Inbox',
  active: 'Active',
  next: 'Next Actions',
  waiting: 'Waiting For',
  someday: 'Someday / Maybe',
  completed: 'Completed',
  trash: 'Trash',
}
```

- [ ] **Step 2: Проверить сборку**

Run: `cd frontend && npx tsc --noEmit`

---

## Task 6: Починить светофор — корректный статус при SSE-реконнекте

**Files:**
- Modify: `frontend/src/components/StatusLight.tsx`

Проблема: `sseState === 'error'` даёт `'syncing'` (синий), хотя синхронизация может не идти. SSE может кратковременно падать при реконнекте.

- [ ] **Step 1: Исправить useConnectionStatus**

```typescript
function useConnectionStatus(): Status {
  const { isOnline, pendingCount, isSyncing } = useSyncStatus()
  const sseState = useNotificationStore((s) => s.sseState)
  const backendAlive = useBackendAlive()

  if (!isOnline) return 'offline'
  if (backendAlive === null) return 'loading'
  if (!backendAlive) return 'error'
  if (isSyncing) return 'syncing'
  if (pendingCount > 0) return 'queued'
  return 'online'
}
```

Убрать строку `if (sseState === 'error') return 'syncing'`. Теперь SSE-ошибка больше не показывает синий "syncing" когда данные синхронизированы. SSE-реконнект — внутреннее дело, не влияющее на perceived sync-статус.

- [ ] **Step 2: Проверить сборку**

Run: `cd frontend && npx tsc --noEmit`

---

## Task 7: Увеличить debounce интервалы и уменьшить частоту polling

**Files:**
- Modify: `frontend/src/components/SyncProvider.tsx`

Увеличим `PULL_DEBOUNCE_MS` с 1.5с до 3с и `PUSH_DEBOUNCE_MS` с 2с до 1.5с (push быстрее — данные на сервере важнее). Уменьшим частоту подсчёта pending-мутаций.

- [ ] **Step 1: Изменить константы**

```typescript
const PULL_INTERVAL = 15 * 60 * 1000
const PUSH_DEBOUNCE_MS = 1500
const PULL_DEBOUNCE_MS = 3000
```

- [ ] **Step 2: Уменьшить частоту countPending**

Строка 192, изменить `setInterval(countPending, 5000)` на `setInterval(countPending, 15000)`:

```typescript
const interval = setInterval(countPending, 15000)
```

- [ ] **Step 3: Проверить сборку**

Run: `cd frontend && npx tsc --noEmit`

---

## Task 8: Финальная проверка

- [ ] **Step 1: Полная проверка фронтенда**

Run: `cd frontend && npm run lint && npx tsc --noEmit`

- [ ] **Step 2: Полная проверка бэкенда**

Run: `cd backend && ruff check . && pytest tests/ -v`

- [ ] **Step 3: Обновить docs/features.md**
