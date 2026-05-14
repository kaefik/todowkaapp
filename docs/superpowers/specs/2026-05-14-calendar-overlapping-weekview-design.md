# Пересекающиеся задачи и события в виде Неделя

**Дата:** 2026-05-14
**Статус:** Approved

## Проблема

В WeekView и DayView задачи с точным временем не участвуют в алгоритме раскладки пересечений (`getOverlappingGroups`). Они привязываются к часу начала с фиксированной высотой (`maxHeight: HOUR_HEIGHT - 2`) и накладываются поверх событий.

Проблемы:
- Задача и событие в одно время — задача перекрывает событие
- Две задачи в один час — накладываются друг на друга
- Задача не отражает реальную позицию в сетке (всегда 1 час)

## Решение: Unified Item (Подход A)

Привести задачи и события к общему интерфейсу `CalendarTimedItem` перед передачей в `getOverlappingGroups()`. Единый алгоритм, сортировка по времени.

### Решённые вопросы

| Вопрос | Решение |
|--------|---------|
| Длительность задач в сетке | Фикс 30 минут |
| Приоритет колонок | По времени (раньше — левее) |
| Визуальное отличие | Иконка/маркер на карточке |

## Изменения

### 1. Общий интерфейс CalendarTimedItem

**Файл:** `frontend/src/utils/calendarEvents.ts`

Добавить тип и функцию-маппер:

```ts
export interface CalendarTimedItem {
  id: string
  type: 'event' | 'task'
  startMinute: number
  endMinute: number
  data: CalendarEvent | CalendarTaskItem
}
```

Функция `toTimedItems()` сливает события и задачи в один массив по каждому дню недели. Для задач `endMinute = startMinute + 30`. Возвращает `Map<number, CalendarTimedItem[]>` (dayIndex → items).

`CalendarTimedItem` совместим с generic-параметром `getOverlappingGroups<T>` — менять алгоритм не нужно.

### 2. WeekView — единый positionedItems

**Файл:** `frontend/src/components/calendar/WeekView.tsx`

Заменить `positionedDayEvents` + `timedTasksByDay` на единый `positionedItems`:

- Вызвать `toTimedItems()` для объединения событий и задач
- Передать в `getOverlappingGroups()` — получаем column/totalColumns
- Position: top по startMinute, height по длительности (минимум 18px)
- В рендере: один цикл по `positionedItems`, по `item.type` рендерим `CalendarEventCard` или `CalendarTaskCard`

Десктоп и мобильная версия (`MobileDayCol`) обновляются одинаково.

### 3. DayView — тот же паттерн

**Файл:** `frontend/src/components/calendar/DayView.tsx`

Применить тот же паттерн:
- Заменить `positionedDayEvents` + отдельный рендер задач на единый `positionedItems`
- Убрать отдельный маппинг timed-задач
- All-day секция не меняется

### 4. Визуальное отличие — маркеры

**Файлы:** `CalendarEventCard.tsx`, `CalendarTaskCard.tsx`

Добавить prop `showMarker?: boolean`:
- Событие: маленькая иконка календаря перед title
- Задача: иконка чекбокса/флага перед title

WeekView и DayView передают `showMarker={true}` для timed-карточек.

## Что НЕ меняется

- `getOverlappingGroups()` — работает как есть
- All-day секция (верхняя область с multi-day барами)
- `CalendarTaskItem` интерфейс в `useCalendarTasks.ts`
- API и бэкенд
- MonthView и YearView

## Файлы

| Файл | Изменение |
|------|-----------|
| `frontend/src/utils/calendarEvents.ts` | +`CalendarTimedItem`, +`toTimedItems()` |
| `frontend/src/components/calendar/WeekView.tsx` | Единый `positionedItems`, единый рендер |
| `frontend/src/components/calendar/DayView.tsx` | Тот же паттерн |
| `frontend/src/components/calendar/CalendarEventCard.tsx` | +prop `showMarker` |
| `frontend/src/components/calendar/CalendarTaskCard.tsx` | +prop `showMarker` |

## Риск

Минимальный — алгоритм `getOverlappingGroups` не трогается, меняем только маппинг входных данных и рендер.
