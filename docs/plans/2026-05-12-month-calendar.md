# План: Исправление наложения задач «на весь день» в виде «Неделя»

**Дата:** 2026-05-12
**Статус:** Черновик
**Файл:** `frontend/src/components/calendar/WeekView.tsx`

## Проблема

В виде «Неделя» задачи и события «на весь день» визуально накладываются друг на друга и на соседние дни из-за ошибок в grid-лейауте секции all-day (строки 271-315).

### Конкретные баги

1. **Конфликт grid-размещения (строки 280-313)**
   - Однодневные all-day события: 7 вложенных `<div>` внутри `weekDays.map()` — не являются прямыми детьми grid-контейнера, CSS Grid auto-placement к ним не применяется корректно
   - Многодневные бары: явно установлены в `gridRow: '1'` как прямые дети grid
   - Результат: бары блокируют ячейки в строке 1, вложенные div-ы дней с однодневными событиями попадают в auto-placement и вытесняются

2. **`position: relative` + `top` у баров (строка 305)**
   - Все бары в `gridRow: '1'`, но визуально сдвинуты через `top: barIdx * 26`
   - Однодневные события, вытолкнутые в строку 2, накладываются на визуально сдвинутые бары

3. **Некорректный расчёт высоты (строки 189-197)**
   - `allDayRowCount = maxRows + barRows` не соответствует реальному grid-лейауту
   - Контейнер может быть слишком маленьким или слишком большим

4. **Нет `overflow: hidden` на секции (строка 274)**
   - Контейнер all-day не ограничивает переполнение

### Корневая причина

Однодневные события рендерятся как **вложенные** `<div>` внутри `weekDays.map()`, а не как прямые дети grid-контейнера. CSS Grid размещает только **прямых детей**. Поэтому `gridRow`/`gridColumn` нельзя назначить однодневным событиям в текущей структуре — они не участвуют в grid-layout.

## Решение

### Принцип

Все видимые элементы (бары, однодневные события, задачи) должны быть **прямыми детьми** grid-контейнера с явными `gridRow` и `gridColumn`. Вложенные контейнеры дней убираются.

### Шаг 1: Подготовить данные для плоского рендера

Добавить мемоизированную структуру, объединяющую однодневные события и задачи с их позициями:

```ts
const flatAllDayItems = useMemo(() => {
  const items: {
    type: 'event' | 'task'
    data: CalendarEvent | CalendarTask
    dayIndex: number
    positionInDay: number
  }[] = []

  for (let i = 0; i < 7; i++) {
    const events = singleAllDayByDay.get(i) || []
    const tasks = allDayTasksByDay.get(i) || []
    let pos = 0
    for (const e of events) {
      items.push({ type: 'event', data: e, dayIndex: i, positionInDay: pos++ })
    }
    for (const t of tasks) {
      items.push({ type: 'task', data: t, dayIndex: i, positionInDay: pos++ })
    }
  }

  return items
}, [singleAllDayByDay, allDayTasksByDay])
```

### Шаг 2: Явное назначение grid-строк

Grid layout: 8 колонок (1 — лейбл «Весь день», 2–8 — дни).

**Многодневные бары (прямые дети grid):**
- `gridRow: barIdx + 1`
- `gridColumn: startIdx + 2 / startIdx + 2 + span`
- Убрать `position: relative`, `top`, `zIndex: 3`

**Однодневные all-day события и задачи (прямые дети grid):**
- `gridRow: multiDayBars.length + 1 + item.positionInDay`
- `gridColumn: item.dayIndex + 2`
- Каждое событие/задача — отдельный grid-child, своя строка

**Лейбл «Весь день» (первая колонка):**
- `gridColumn: 1`, `gridRow: 1 / span allDayRowCount`

### Шаг 3: Исправить расчёт высоты

```ts
const allDayRowCount = useMemo(() => {
  let maxSingleRows = 0
  for (let i = 0; i < 7; i++) {
    const count = (singleAllDayByDay.get(i)?.length || 0) + (allDayTasksByDay.get(i)?.length || 0)
    maxSingleRows = Math.max(maxSingleRows, count)
  }
  return multiDayBars.length + maxSingleRows
}, [singleAllDayByDay, allDayTasksByDay, multiDayBars])
```

Высота контейнера: `allDayRowCount * 26 + 8`.

Если `allDayRowCount === 0`, но есть `multiDayBars.length > 0` — корректно (barRows входят в `allDayRowCount`).

### Шаг 4: Реструктурировать JSX (строки 271-315)

Заменить текущий рендер на:

```jsx
{(categorized.topEvents.length > 0 || allDayTasks.length > 0) && (
  <div
    className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
    style={{ minHeight: allDayRowCount * 26 + 8 }}
  >
    {/* Лейбл */}
    <div
      className="text-xs text-gray-400 dark:text-gray-500 py-1 pr-2 text-right"
      style={{ gridColumn: 1, gridRow: `1 / span ${allDayRowCount}` }}
    >
      {t('allDay', { defaultValue: 'Весь день' })}
    </div>

    {/* Многодневные бары */}
    {multiDayBars.map(({ event, startIdx, span }, barIdx) => (
      <div
        key={`bar-${event.id}-${barIdx}`}
        className="px-0.5"
        style={{
          gridColumn: `${startIdx + 2} / ${startIdx + 2 + span}`,
          gridRow: barIdx + 1,
          height: 22,
        }}
      >
        <CalendarEventCard event={event} compact onClick={() => setDetailEvent(event)} />
      </div>
    ))}

    {/* Однодневные события и задачи */}
    {flatAllDayItems.map((item) => {
      const row = multiDayBars.length + 1 + item.positionInDay
      if (item.type === 'event') {
        const e = item.data as CalendarEvent
        return (
          <div
            key={`evt-${e.id}`}
            className="px-0.5"
            style={{ gridColumn: item.dayIndex + 2, gridRow: row }}
          >
            <CalendarEventCard event={e} compact onClick={() => setDetailEvent(e)} />
          </div>
        )
      }
      const t = item.data as CalendarTask
      return (
        <div
          key={`task-${t.id}`}
          className="px-0.5"
          style={{ gridColumn: item.dayIndex + 2, gridRow: row }}
        >
          <CalendarTaskCard task={t} compact onClick={() => openTaskDetail(t.id)} />
        </div>
      )
    })}
  </div>
)}
```

**Что убрано:**
- Вложенный `weekDays.map()` с `<div key={i}>` — больше не нужен
- `position: relative` и `top: barIdx * 26` у баров
- `zIndex: 3` у баров
- Добавлен `overflow-hidden` на grid-контейнер

## Изменяемые файлы

| Файл | Изменение |
|------|-----------|
| `frontend/src/components/calendar/WeekView.tsx` | Новый мемо `flatAllDayItems`, реструктуризация секции all-day (строки 271-315) |

## Схема нового лейаута

```
         col 1      col 2   col 3   col 4   col 5   col 6   col 7   col 8
                   ┃  Пн   ┃  Вт   ┃  Ср   ┃  Чт   ┃  Пт   ┃  Сб   ┃  Вс
row 1:  ┃ Весь   ┃ ██████████████ Бар 1 █████████████████████████████████
row 2:  ┃ день   ┃ ████████ Бар 2 ████████ ┃        ┃        ┃        ┃
row 3:  ┃        ┃ evt1   ┃        ┃ evt2   ┃        ┃        ┃        ┃
row 4:  ┃        ┃ evt3   ┃ ts1    ┃        ┃        ┃ ts2    ┃        ┃
```

- Каждое однодневное событие/задача занимает свою grid-строку
- Бары занимают свои строки выше
- Никаких вложенных div-ов — все элементы прямые дети grid

## Граничные случаи

| Сценарий | Поведение |
|----------|-----------|
| 0 баров, только однодневные события | `barCount = 0`, события начинаются с row 1 |
| 0 однодневных, только бары | Событий нет, `flatAllDayItems = []`, рендерятся только бары |
| День без событий | Пустые ячейки в этом дне |
| 5+ событий в одном дне | Секция растёт, `maxSingleRows` увеличивает высоту |

## Проверка

После реализации:
1. Создать 2-3 многодневных all-day события, пересекающихся по дням
2. Создать несколько однодневных all-day событий на те же дни
3. Создать all-day задачи на разные дни
4. Создать 3+ однодневных события на один день
5. Убедиться что:
   - Бары не накладываются на однодневные события
   - Однодневные события выровнены по вертикали во всех колонках
   - Карточки не выходят за границы своих колонок
   - Высота секции all-day корректно подстраивается под содержимое
   - Каждое событие/задача в дне занимает свою строку, без наложений
