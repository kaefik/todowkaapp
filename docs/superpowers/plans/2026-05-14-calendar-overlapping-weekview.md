# Calendar Overlapping — Week View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Объединить задачи и события в единый алгоритм раскладки в WeekView, чтобы пересекающиеся элементы корректно делили пространство.

**Architecture:** Привести CalendarEvent и CalendarTaskItem к общему интерфейсу CalendarTimedItem, передать в существующий getOverlappingGroups(). DayView уже частично реализует этот подход — нужно вынести общую логику в utils и применить к WeekView.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/utils/calendarEvents.ts` | Modify | Добавить CalendarTimedItem, toTimedItems() |
| `frontend/src/components/calendar/WeekView.tsx` | Modify | Заменить positionedDayEvents + timedTasksByDay на единый positionedItems |
| `frontend/src/components/calendar/DayView.tsx` | Modify | Использовать toTimedItems() вместо inline-логики, убрать taskHours |
| `frontend/src/components/calendar/CalendarTaskCard.tsx` | Modify | Добавить showMarker prop |

## Key Facts

- DayView (строки 88-142) уже сливает события и задачи в единый массив и вызывает getOverlappingGroups(). Но: задачи получают endMinute = startMinute + 60 (нужно 30), и логика inline вместо shared utility.
- WeekView НЕ объединяет — positionedDayEvents работает только с событиями, задачи рендерятся отдельно (строки 264-278, 440-453).
- getOverlappingGroups уже generic — принимает любой T с startMinute/endMinute. Менять не нужно.
- CalendarEventCard уже имеет иконку 📅 в рендере (строка 50). CalendarTaskCard не имеет маркера.
- HOUR_HEIGHT: WeekView=40 (десктоп), 44 (мобильный). DayView=48.

---

### Task 1: CalendarTimedItem + toTimedItems() в calendarEvents.ts

**Files:**
- Modify: `frontend/src/utils/calendarEvents.ts`

- [ ] **Step 1: Добавить тип CalendarTimedItem**

Добавить после строки 1 (после EventCategory type):

```ts
export interface CalendarTimedItem {
  id: string
  type: 'event' | 'task'
  startMinute: number
  endMinute: number
  data: Record<string, unknown>
}
```

Примечание: `data: Record<string, unknown>` чтобы избежать циклических зависимостей с хуками. В рендере — type guard по `type` field.

- [ ] **Step 2: Добавить функцию toTimedItems()**

Добавить после CalendarTimedItem:

```ts
const TASK_DEFAULT_DURATION = 30

export function toTimedItems(
  events: { id: string; start_time: string; end_time: string | null; all_day: boolean }[],
  tasks: { id: string; start_time: string; all_day: boolean }[],
): CalendarTimedItem[] {
  const items: CalendarTimedItem[] = []

  for (const e of events) {
    if (e.all_day) continue
    const start = new Date(e.start_time)
    const startMinute = start.getHours() * 60 + start.getMinutes()
    const end = e.end_time ? new Date(e.end_time) : null
    const durationMin = end ? Math.max(15, (end.getTime() - start.getTime()) / (1000 * 60)) : 60
    items.push({
      id: `event-${e.id}`,
      type: 'event',
      startMinute,
      endMinute: startMinute + durationMin,
      data: e as unknown as Record<string, unknown>,
    })
  }

  for (const t of tasks) {
    if (t.all_day) continue
    const start = new Date(t.start_time)
    const startMinute = start.getHours() * 60 + start.getMinutes()
    items.push({
      id: `task-${t.id}`,
      type: 'task',
      startMinute,
      endMinute: startMinute + TASK_DEFAULT_DURATION,
      data: t as unknown as Record<string, unknown>,
    })
  }

  return items
}
```

- [ ] **Step 3: Проверить компиляцию**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: Нет ошибок в calendarEvents.ts

---

### Task 2: WeekView — единый positionedItems

**Files:**
- Modify: `frontend/src/components/calendar/WeekView.tsx`

- [ ] **Step 1: Добавить импорт toTimedItems**

В строке 16-22 блока импортов из calendarEvents, добавить `toTimedItems`:

```ts
import {
  isSameDay,
  getEventCategory,
  getDurationMinutes,
  getOverlappingGroups,
  isMultiDay,
  pad,
  toTimedItems,
} from '../../utils/calendarEvents'
```

Убрать неиспользуемый `getDurationMinutes` из импорта (WeekView больше не вызывает его напрямую).

- [ ] **Step 2: Заменить positionedDayEvents на positionedItems**

Заменить useMemo `positionedDayEvents` (строки 231-262) на:

```ts
const positionedItems = useMemo(() => {
  const result = new Map<number, { item: CalendarTimedItem; style: React.CSSProperties }[]>()
  const hourHeight = isMobile ? MOBILE_HOUR_HEIGHT : HOUR_HEIGHT

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const dayEvents = categorized.timedByDay.get(dayIdx) || []
    const dayTasks = timedTasksByDayRaw.get(dayIdx) || []
    const items = toTimedItems(dayEvents, dayTasks)

    if (items.length === 0) continue

    const grouped = getOverlappingGroups(items)
    const positioned = grouped.map(({ item, column, totalColumns }) => {
      const top = (item.startMinute / 60) * hourHeight
      const height = Math.max(((item.endMinute - item.startMinute) / 60) * hourHeight, 18)
      const widthPercent = 100 / totalColumns
      const leftPercent = column * widthPercent
      return {
        item,
        style: {
          top,
          height,
          width: `${widthPercent - 1}%`,
          left: `${leftPercent}%`,
          zIndex: 2,
        } as React.CSSProperties,
      }
    })
    result.set(dayIdx, positioned)
  }
  return result
}, [categorized.timedByDay, timedTasksByDayRaw, isMobile])
```

- [ ] **Step 3: Заменить timedTasksByDay на timedTasksByDayRaw**

Заменить useMemo `timedTasksByDay` (строки 264-278) на упрощённый — Map dayIdx → task array:

```ts
const timedTasksByDayRaw = useMemo(() => {
  const map = new Map<number, CalendarTaskItem[]>()
  for (const t of timedTasks) {
    const dayIdx = weekDays.findIndex((d) => isSameDay(d, new Date(t.start_time)))
    if (dayIdx !== -1) {
      const arr = map.get(dayIdx) || []
      arr.push(t)
      map.set(dayIdx, arr)
    }
  }
  return map
}, [timedTasks, weekDays])
```

- [ ] **Step 4: Добавить импорт CalendarTimedItem**

В начале файла, после импорта useCalendarTasks:

```ts
import { type CalendarTimedItem } from '../../utils/calendarEvents'
```

Обновить строку импорта из calendarEvents:

```ts
import {
  isSameDay,
  getEventCategory,
  getOverlappingGroups,
  isMultiDay,
  pad,
  toTimedItems,
  type CalendarTimedItem,
} from '../../utils/calendarEvents'
```

- [ ] **Step 5: Обновить десктоп-рендер — заменить день column**

В десктоп-рендере (строки 408-455) заменить блок рендера событий и задач:

Заменить строки 410-453 (от `const dayPositioned` до закрывающего `)`) на:

```tsx
const dayPositioned = positionedItems.get(dayIdx) || []

return (
  <div
    key={dayIdx}
    className={`relative overflow-hidden border-r border-gray-100 dark:border-gray-800 ${
      isCurrentDay ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''
    }`}
    style={{ height: totalGridHeight }}
  >
    {Array.from({ length: 24 }, (_, hour) => (
      <div
        key={hour}
        className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
        style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
        onClick={() => handleSlotClick(day, hour)}
      />
    ))}

    {dayPositioned.map(({ item, style }) =>
      item.type === 'event' ? (
        <CalendarEventCard
          key={item.id}
          event={item.data as CalendarEvent}
          showTimeRange
          timedStyle={style}
          showMarker
          onClick={() => setDetailEvent(item.data as CalendarEvent)}
        />
      ) : (
        <CalendarTaskCard
          key={item.id}
          task={item.data as CalendarTaskItem}
          compact
          showTimeRange
          timedStyle={style}
          showMarker
          onClick={() => openTaskDetail((item.data as CalendarTaskItem).id)}
        />
      )
    )}
  </div>
)
```

- [ ] **Step 6: Обновить MobileDayCol**

Заменить проп `timedTasksByDay` на `positionedItems` в интерфейсе `MobileDayColProps` (строки 465-476):

```ts
interface MobileDayColProps {
  day: Date
  dayIdx: number
  isCurrentDay: boolean
  today: Date
  hourHeight: number
  handleSlotClick: (day: Date, hour: number) => void
  positionedItems: Map<number, { item: CalendarTimedItem; style: React.CSSProperties }[]>
  openTaskDetail: (id: string) => void
  setDetailEvent: (e: CalendarEvent | null) => void
}
```

Обновить деструктуризацию в MobileDayCol (строка 478):

```ts
function MobileDayCol({
  day,
  dayIdx,
  isCurrentDay,
  hourHeight,
  handleSlotClick,
  positionedItems,
  openTaskDetail,
  setDetailEvent,
}: MobileDayColProps) {
```

Заменить тело MobileDayCol — убрать `dayPositioned`/`dayTaskMap`, использовать единый `positionedItems`:

```tsx
const dayPositioned = positionedItems.get(dayIdx) || []
const totalHeight = 24 * hourHeight

return (
  <div
    className={`relative overflow-hidden border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${
      isCurrentDay ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''
    }`}
    style={{ height: totalHeight }}
  >
    {Array.from({ length: 24 }, (_, hour) => (
      <div
        key={hour}
        className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
        style={{ top: hour * hourHeight, height: hourHeight }}
        onClick={() => handleSlotClick(day, hour)}
      />
    ))}

    {dayPositioned.map(({ item, style }) =>
      item.type === 'event' ? (
        <CalendarEventCard
          key={item.id}
          event={item.data as CalendarEvent}
          showTimeRange
          timedStyle={style}
          showMarker
          onClick={() => setDetailEvent(item.data as CalendarEvent)}
        />
      ) : (
        <CalendarTaskCard
          key={item.id}
          task={item.data as CalendarTaskItem}
          compact
          showTimeRange
          timedStyle={style}
          showMarker
          onClick={() => openTaskDetail((item.data as CalendarTaskItem).id)}
        />
      )
    )}
  </div>
)
```

- [ ] **Step 7: Обновить WeekViewMobileProps и WeekViewMobile**

Обновить интерфейс `WeekViewMobileProps` (строки 534-552) — заменить `timedTasksByDay` на `positionedItems`:

```ts
interface WeekViewMobileProps {
  weekDays: Date[]
  today: Date
  multiDayBars: { event: CalendarEvent; startIdx: number; span: number }[]
  flatAllDayItems: {
    type: 'event' | 'task'
    data: CalendarEvent | CalendarTaskItem
    dayIndex: number
    positionInDay: number
  }[]
  positionedItems: Map<number, { item: CalendarTimedItem; style: React.CSSProperties }[]>
  allDayRef: React.RefObject<HTMLDivElement | null>
  handleSlotClick: (day: Date, hour: number) => void
  openTaskDetail: (id: string) => void
  setDetailEvent: (e: CalendarEvent | null) => void
  modals: React.ReactNode
  t: (key: string, opts?: { defaultValue?: string }) => string
}
```

Обновить деструктуризацию WeekViewMobile (строка 554):

```ts
function WeekViewMobile({
  weekDays,
  today,
  multiDayBars,
  flatAllDayItems,
  positionedItems,
  allDayRef,
  handleSlotClick,
  openTaskDetail,
  setDetailEvent,
  modals,
  t,
}: WeekViewMobileProps) {
```

Обновить вызовы MobileDayCol (строки 705-718) — передать `positionedItems` вместо `timedTasksByDay`:

```tsx
{visibleDays.map((day, colIdx) => {
  const dayIdx = pairIndex + colIdx
  const isCurrentDay = isSameDay(day, today)
  return (
    <MobileDayCol
      key={dayIdx}
      day={day}
      dayIdx={dayIdx}
      isCurrentDay={isCurrentDay}
      today={today}
      hourHeight={hourHeight}
      handleSlotClick={handleSlotClick}
      positionedItems={positionedItems}
      openTaskDetail={openTaskDetail}
      setDetailEvent={setDetailEvent}
    />
  )
})}
```

Обновить вызов WeekViewMobile из WeekView (строка 312) — передать `positionedItems` вместо `timedTasksByDay`:

```tsx
<WeekViewMobile weekDays={weekDays} today={today} multiDayBars={multiDayBars} flatAllDayItems={flatAllDayItems} positionedItems={positionedItems} allDayRef={allDayRef} handleSlotClick={handleSlotClick} openTaskDetail={openTaskDetail} setDetailEvent={setDetailEvent} modals={modals} t={t} />
```

- [ ] **Step 8: Проверить компиляцию**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: Нет ошибок

---

### Task 3: DayView — использовать toTimedItems()

**Files:**
- Modify: `frontend/src/components/calendar/DayView.tsx`

- [ ] **Step 1: Обновить импорты**

Заменить импорт из calendarEvents (строки 14-19):

```ts
import {
  isSameDay,
  getEventCategory,
  getOverlappingGroups,
  pad,
  toTimedItems,
  type CalendarTimedItem,
} from '../../utils/calendarEvents'
```

Убрать `getDurationMinutes` — больше не нужен напрямую.

- [ ] **Step 2: Заменить positionedItems useMemo**

Заменить useMemo `positionedItems` (строки 88-142) на:

```ts
const positionedItems = useMemo(() => {
  const items = toTimedItems(timedEvents, timedTasks)
  const grouped = getOverlappingGroups(items)

  return grouped.map(({ item, column, totalColumns }) => {
    const top = (item.startMinute / 60) * HOUR_HEIGHT
    const height = Math.max(((item.endMinute - item.startMinute) / 60) * HOUR_HEIGHT, 20)
    const widthPercent = 100 / totalColumns
    const leftPercent = column * widthPercent

    return {
      type: item.type as 'event' | 'task',
      data: item.data,
      style: {
        top,
        height,
        width: `${widthPercent - 1}%`,
        left: `${leftPercent}%`,
        zIndex: 2,
      } as React.CSSProperties,
    }
  })
}, [timedEvents, timedTasks])
```

- [ ] **Step 3: Убрать taskHours useMemo**

Удалить useMemo `taskHours` (строки 144-153) — больше не используется.

- [ ] **Step 4: Обновить рендер — убрать taskHours из hour click**

В рендере часовых слотов (строки 211-224) убрать ссылку на `taskHours`:

Заменить:
```tsx
const hourTasks = taskHours.get(hour) || []
```
И:
```tsx
onClick={() => hourTasks.length === 0 && handleSlotClick(hour)}
```
На:
```tsx
onClick={() => handleSlotClick(hour)}
```

- [ ] **Step 5: Обновить рендер positionedItems — добавить showMarker**

В блоке рендера positionedItems (строки 235-254) добавить `showMarker` к CalendarTaskCard:

```tsx
{positionedItems.map(({ type, data, style }) =>
  type === 'event' ? (
    <CalendarEventCard
      key={`event-${(data as CalendarEvent).id}`}
      event={data as CalendarEvent}
      showTimeRange
      timedStyle={style}
      onClick={() => setDetailEvent(data as CalendarEvent)}
    />
  ) : (
    <CalendarTaskCard
      key={`task-${(data as CalendarTaskItem).id}`}
      task={data as CalendarTaskItem}
      compact
      showTimeRange
      timedStyle={style}
      showMarker
      onClick={() => openTaskDetail((data as CalendarTaskItem).id)}
    />
  )
)}
```

- [ ] **Step 6: Проверить компиляцию**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: Нет ошибок

---

### Task 4: CalendarTaskCard — showMarker prop

**Files:**
- Modify: `frontend/src/components/calendar/CalendarTaskCard.tsx`

- [ ] **Step 1: Добавить showMarker в интерфейс и рендер**

Добавить `showMarker` в CalendarTaskCardProps (строка 3-9):

```ts
interface CalendarTaskCardProps {
  task: CalendarTaskItem
  onClick?: () => void
  compact?: boolean
  timedStyle?: React.CSSProperties
  showTimeRange?: boolean
  showMarker?: boolean
}
```

Обновить деструктуризацию (строка 11):

```ts
export function CalendarTaskCard({ task, onClick, compact, timedStyle, showTimeRange, showMarker }: CalendarTaskCardProps) {
```

Добавить иконку в title span (перед `{task.title}`, после completed checkmark):

```tsx
<span className={titleClass}>
  {isCompleted && <span className="mr-1">&#10003;</span>}
  {showMarker && <span className="mr-1">⚑</span>}
  {task.title}
</span>
```

- [ ] **Step 2: Проверить компиляцию**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: Нет ошибок

---

### Task 5: Финальная проверка

- [ ] **Step 1: Полная проверка TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: ESLint**

Run: `cd frontend && npm run lint`
Expected: 0 errors

- [ ] **Step 3: Ручное тестирование — описать сценарии**

Проверить в WeekView (десктоп):
1. Создать событие 10:00-12:00
2. Создать задачу с due_date на то же число, время 10:30
3. Оба должны отображаться рядом (side-by-side), задача — с иконкой ⚑, событие — с 📅
4. Задача должна быть ~30 мин высотой, событие — 2 часа

Проверить в WeekView (мобильный):
1. Свайп между днями — positionedItems корректно переключаются

Проверить в DayView:
1. Пересекающиеся задача + событие — side-by-side
2. All-day задачи/события — без изменений

- [ ] **Step 4: Обновить docs/features.md**

Добавить в соответствующую категорию:

```
- Пересекающиеся задачи и события в виде Неделя и День отображаются рядом (side-by-side) с пропорциональной высотой
```
