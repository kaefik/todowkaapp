# Review History — сравнение с предыдущим обзором

**Дата:** 2026-05-03
**Статус:** Approved
**Подход:** Inline в `/review/summary` (подход A)

## Контекст

Review snapshots уже сохраняются в БД при `POST /review/complete` (модель `ReviewSnapshot`). На фронте есть Dashboard и Completion, но нет сравнения «как было → как стало» по отношению к прошлому обзору.

## Цель

Показать дельту метрик (inbox, overdue, stale, projects without next, done, health) по сравнению с предыдущим обзором — на Dashboard и на Completion.

## Backend

### Изменения в `ReviewService.get_summary()`

Добавить запрос последнего snapshot:

```python
stmt = (
    select(ReviewSnapshot)
    .where(ReviewSnapshot.user_id == user_id)
    .order_by(ReviewSnapshot.created_at.desc())
    .limit(1)
)
previous = (await db.execute(stmt)).scalar_one_or_none()
```

Если snapshot есть — вернуть как `previous_snapshot`. Если нет (первый обзор) — `null`.

### Новая схема `PreviousSnapshot`

```python
class PreviousSnapshot(BaseModel):
    created_at: datetime
    inbox_count: int
    overdue_count: int
    done_count: int
    stale_count: int
    projects_without_next: int
    health_status: str  # "ok" | "attention" | "problems"
```

### Изменение `ReviewSummaryResponse`

Добавить поле:

```python
previous_snapshot: PreviousSnapshot | None = None
```

Никаких новых миграций — `review_snapshots` уже существует и заполняется.

## Frontend

### Типы (`api/review.ts`)

```typescript
interface PreviousSnapshot {
  created_at: string
  inbox_count: number
  overdue_count: number
  done_count: number
  stale_count: number
  projects_without_next: number
  health_status: "ok" | "attention" | "problems"
}

interface ReviewSummary {
  // ... existing fields
  previous_snapshot: PreviousSnapshot | null
}
```

### Дельта-утилита

Функция `computeDelta(current, previous)` — возвращает объект:

```typescript
interface MetricDelta {
  value: number      // текущее значение
  delta: number      // разница (negative = improvement для inbox/overdue/stale/projects)
  improved: boolean  // true = зелёный, false = красный
}
```

Правила improved:
- `inbox_count`: delta < 0 = improved
- `overdue_count`: delta < 0 = improved
- `stale_count`: delta < 0 = improved
- `projects_without_next`: delta < 0 = improved
- `done_count`: delta > 0 = improved
- `health_status`: ordinal comparison (ok=3, attention=2, problems=1), higher = improved

### Dashboard (`ReviewDashboard.tsx`)

Под каждой из 4 метрик (inbox, overdue, done, stale) — если есть `previous_snapshot`:
- Показать стрелку + дельту: `↓3` или `↑1`
- Цвет: зелёный если improved, красный если worsened
- Если дельта = 0 — серый `—`
- Серый мелкий шрифт, не перетягивает внимание

### Completion (`ReviewCompletion.tsx`)

Блок «Сравнение с прошлым обзором»:
- Дата прошлого обзора
- Таблица: метрика | было → стало | дельта со стрелкой
- Health transition: «problems → ok» или «ok → attention» и т.д.
- Только если `previous_snapshot` есть

### i18n

Ключи:
- `review:comparison.title` — «Сравнение с прошлым обзором»
- `review:comparison.previousDate` — «Прошлый обзор: {date}»
- `review:comparison.noChange` — «Без изменений»
- `review:delta.up` — «↑»
- `review:delta.down` — «↓»

## Не входит в scope

- Графики и тренды за N недель
- Отдельный `GET /review/history` endpoint
- Resume progress (автосохранение)
- Удаление ReviewMinimap.tsx (отдельный cleanup)

## Файлы

- `backend/app/services/review_service.py` — запрос previous snapshot
- `backend/app/schemas/review.py` — PreviousSnapshot, ReviewSummaryResponse
- `frontend/src/api/review.ts` — типы
- `frontend/src/components/review/ReviewDashboard.tsx` — дельта на метриках
- `frontend/src/components/review/ReviewCompletion.tsx` — блок сравнения
- `frontend/src/utils/reviewDelta.ts` — computeDelta утилита
- `frontend/src/i18n/locales/ru/review.json` — ключи
- `frontend/src/i18n/locales/en/review.json` — ключи
