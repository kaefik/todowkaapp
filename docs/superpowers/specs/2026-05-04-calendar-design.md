# Calendar Feature — Design Spec

**Дата:** 2026-05-04
**Статус:** Approved

## Цель

Добавить полноценный календарь в Todowka с 4 видами (день, неделя, месяц, год) для визуализации нагрузки, планирования дат и стратегического обзора задач.

## Зачем

1. **Слепая зона:** сейчас видны только «Сегодня» и «Завтра», но нет обзора на неделю/месяц/год вперёд
2. **Невидимая перегрузка:** нельзя увидеть, что на среду 12 задач, а на четверг — 0
3. **Неудобное назначение дат:** через TaskEditModal медленно, drag-and-drop в календаре — мгновенно
4. **Стратегический обзор:** GTD без календарной картины — неполноценный

## Модель данных

### Новая сущность — CalendarEvent

Простые события (не GTD-задачи) — для записей в расписании без статусов и проектов.

```python
class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: str (UUID, PK)
    user_id: str (FK → users.id, NOT NULL)
    title: str (255, NOT NULL)
    description: text | NULL
    start_time: datetime (timezone-aware, NOT NULL)
    end_time: datetime | NULL (timezone-aware)
    all_day: bool (default False)
    color: str | NULL  # кастомный цвет (hex)
    created_at: datetime (server_default=now)
    updated_at: datetime (onupdate=now)
```

**Индексы:** `(user_id, start_time)` — для запросов по диапазону дат.

**API:** `GET/POST/PUT/DELETE /api/calendar-events`
- GET с фильтрами: `start_from`, `start_to` (диапазон дат)
- POST: валидация `end_time > start_time` если `end_time` задан
- PUT: обновление любых полей
- DELETE: мягкое удаление через sync (аналогично задачам)

### Виртуальные события из Task

Задачи с `due_date` отображаются в календаре без отдельной модели. Маппинг:

| Поле Task | Поле виртуального события |
|-----------|--------------------------|
| `due_date` (с временем) | `start_time` — точное время |
| `due_date` (без времени, 23:59:59) | `all_day = True` |
| `title` | `title` |
| `gtd_status` | `color` (по статусу) |
| `project_id` | metadata для фильтрации |

Цветовая кодировка по GTD-статусу:
- `inbox` — серый
- `active` — blue
- `next` — indigo
- `waiting` — yellow
- `someday` — purple
- Просроченные — красная подсветка

### Frontend — Dexie

Новый table `calendarEvents` в `database.ts`:

```typescript
interface DbCalendarEvent {
  id: string
  userId: string
  title: string
  description?: string
  startTime: string  // ISO datetime
  endTime?: string   // ISO datetime
  allDay: boolean
  color?: string
  createdAt: string
  updatedAt: string
  _syncStatus?: string
  _updatedAt?: number
}
```

Sync mapping в `syncEngine.ts` — аналогично другим сущностям.

## UI — 4 вида

### Роут и навигация

- Роут: `/calendar` — новая страница
- Сайдбар: секция «Просмотр», пункт «Календарь»
- Переключатель видов: 4 кнопки-вкладки сверху (День | Неделя | Месяц | Год)
- Выбранный вид сохраняется в localStorage (`calendar-view`)
- Навигация: ← → по периодам + кнопка «Сегодня»

### DayView (вид дня)

- Временная шкала слева (00:00–23:00, шаг 1 час)
- События и задачи с конкретным временем — блоки на шкале (высота = длительность)
- Задачи без времени (all_day) — полоса сверху над шкалой
- Drag-and-drop: перетаскивание между часами и днями
- Клик на пустой слот → создание CalendarEvent

### WeekView (вид недели)

- 7 колонок (Пн–Вс), временная шкала слева (00:00–23:00)
- Текущий день подсвечен (indigo border/bg)
- Задачи/события — карточки в соответствующих колонках и часах
- All-day события — горизонтальная полоса сверху над каждым днём
- Drag-and-drop: между днями и часами

### MonthView (вид месяца)

- Классическая сетка 7×5/6 (зависит от месяца)
- Ячейка дня: до 3 задач/событий + «+N ещё» при превышении
- Клик на день → DayDetailDrawer (панель справа) со списком всех задач/событий этого дня
- Drag-and-drop: перетаскивание задач между ячейками (меняет due_date)
- Текущий день — ring/highlight

### YearView (вид года)

- 12 мини-месяцев сеткой (4×3)
- Каждый мини-месяц — уменьшенная сетка дней
- Дни с задачами/событиями — цветные точки (цвет = GTD-статус или event color)
- Клик на месяц → переход в MonthView этого месяца
- Клик на конкретный день → переход в DayView

### Общие элементы

- **CalendarHeader:** навигация ← → + название периода + «Сегодня» + переключатель видов
- **CalendarTaskCard:** карточка задачи в календаре (название, время, GTD-статус badge)
- **CalendarEventCard:** карточка события (название, время, цветной маркер)
- **EventEditorModal:** создание/редактирование CalendarEvent (React Hook Form + Zod)
- **DayDetailDrawer:** боковая панель деталей дня (для MonthView)

## Drag-and-drop

**Библиотека:** `@dnd-kit` (уже в проекте).

### Поведение

| Что | Куда | Результат |
|-----|------|-----------|
| Задача с due_date | Другой день | `due_date` обновляется |
| Задача без due_date | День в календаре | `due_date` устанавливается, статус → `active` |
| CalendarEvent | Другой день/час | `start_time`/`end_time` сдвигаются |
| CalendarEvent | Через границу all-day | `all_day` переключается |

Все обновления идут через Dexie → sync engine → backend.

## Быстрое создание

- Клик на пустой слот в DayView/WeekView → мини-форма (title + время) → CalendarEvent
- Enter → сохранение, Escape → отмена
- Drag создания (click + drag для задания длительности) — опционально, фаза 2

## Структура файлов

### Frontend

```
frontend/src/
├── routes/
│   └── Calendar.tsx                          # Страница /calendar
├── components/calendar/
│   ├── CalendarHeader.tsx                    # Навигация + переключатель видов + «Сегодня»
│   ├── DayView.tsx                           # Вид дня
│   ├── WeekView.tsx                          # Вид недели
│   ├── MonthView.tsx                         # Вид месяца
│   ├── YearView.tsx                          # Вид года
│   ├── CalendarCell.tsx                      # Ячейка дня (переиспользуется)
│   ├── CalendarTaskCard.tsx                  # Карточка задачи
│   ├── CalendarEventCard.tsx                 # Карточка события
│   ├── EventEditorModal.tsx                  # Создание/редактирование события
│   └── DayDetailDrawer.tsx                   # Панель деталей дня
├── hooks/
│   ├── useCalendarEvents.ts                  # CRUD CalendarEvents (Dexie + sync)
│   ├── useCalendarTasks.ts                   # Маппинг Task → виртуальные события
│   └── useCalendarView.ts                    # Состояние вида + навигация по датам
├── stores/
│   └── calendarStore.ts                      # Zustand: текущий вид, дата, фильтры
└── i18n/locales/{ru,en}/
    └── calendar.json                         # Переводы
```

### Backend

```
backend/app/
├── models/calendar_event.py                  # SQLAlchemy модель
├── schemas/calendar_event.py                 # Pydantic схемы (Create/Update/Response)
├── services/calendar_event_service.py        # CRUD бизнес-логика
├── api/calendar_events.py                    # API роутер
└── alembic/versions/
    └── XXX_add_calendar_events_table.py      # Миграция
```

### Dexie

- `database.ts`: таблица `calendarEvents` + миграция версии
- `syncEngine.ts`: sync mapping для `calendar_events`

## i18n

Пространство `calendar` с ключами:
- viewDay, viewWeek, viewMonth, viewYear
- today, previous, next
- createEvent, editEvent, deleteEvent
- noEvents, allDay
- +N more (для MonthView)

## Фаза 2 (отложено)

- Drag создания (click + drag для длительности)
- Ресайз событий (тянуть за край)
- Повторяющиеся события (аналог рекуррентных задач)
- Интеграция с Google Calendar / Apple Calendar
- Фильтр по проекту/контексту/тегу в календаре
- Печать/экспорт календаря
