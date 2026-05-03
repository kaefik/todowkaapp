# Review History — сравнение с предыдущим обзором

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать дельту метрик (inbox, overdue, stale, done, health) по сравнению с предыдущим обзором на Dashboard и Completion.

**Architecture:** Обогащаем `/review/summary` полем `previous_snapshot` (последний ReviewSnapshot из БД). Фронтенд считает дельту и показывает стрелки ↑↓ с цветом.

**Tech Stack:** Python/FastAPI/SQLAlchemy (backend), React/TypeScript/Tailwind (frontend), i18n (ru/en)

---

### Task 1: Backend — PreviousSnapshot схема

**Files:**
- Modify: `backend/app/schemas/review.py`

- [ ] **Step 1: Добавить схему PreviousSnapshot**

В `backend/app/schemas/review.py` добавить перед `ReviewSummaryResponse`:

```python
class PreviousSnapshot(BaseModel):
    created_at: datetime
    inbox_count: int
    overdue_count: int
    done_count: int
    stale_count: int
    projects_without_next: int
    health_status: str
```

- [ ] **Step 2: Добавить поле в ReviewSummaryResponse**

В класс `ReviewSummaryResponse` добавить после `alerts`:

```python
    previous_snapshot: PreviousSnapshot | None = None
```

- [ ] **Step 3: Проверить ruff**

Run: `cd backend && ruff check app/schemas/review.py`
Expected: All checks passed

---

### Task 2: Backend — запрос previous snapshot в get_summary

**Files:**
- Modify: `backend/app/services/review_service.py`

- [ ] **Step 1: Добавить запрос последнего snapshot**

В методе `get_summary()` перед `return {` (строка ~138) добавить:

```python
        previous_snapshot_result = await self.db.execute(
            select(ReviewSnapshot)
            .where(ReviewSnapshot.user_id == user_id)
            .order_by(ReviewSnapshot.created_at.desc())
            .limit(1)
        )
        previous = previous_snapshot_result.scalar_one_or_none()
```

- [ ] **Step 2: Добавить previous_snapshot в return dict**

В `return {` блок добавить в конец (перед закрывающей `}`):

```python
            'previous_snapshot': {
                'created_at': previous.created_at.isoformat(),
                'inbox_count': previous.inbox_count,
                'overdue_count': previous.overdue_count,
                'done_count': previous.done_count,
                'stale_count': previous.stale_count,
                'projects_without_next': previous.projects_without_next,
                'health_status': previous.health_status,
            } if previous else None,
```

- [ ] **Step 3: Проверить ruff**

Run: `cd backend && ruff check app/services/review_service.py`
Expected: All checks passed

---

### Task 3: Frontend — типы и computeDelta

**Files:**
- Modify: `frontend/src/api/review.ts`
- Create: `frontend/src/utils/reviewDelta.ts`

- [ ] **Step 1: Добавить тип PreviousSnapshot в review.ts**

В `frontend/src/api/review.ts` добавить перед `ReviewSummary`:

```typescript
export interface PreviousSnapshot {
  created_at: string
  inbox_count: number
  overdue_count: number
  done_count: number
  stale_count: number
  projects_without_next: number
  health_status: 'ok' | 'attention' | 'problems'
}
```

- [ ] **Step 2: Добавить поле в ReviewSummary**

В интерфейс `ReviewSummary` добавить после `alerts`:

```typescript
  previous_snapshot: PreviousSnapshot | null
```

- [ ] **Step 3: Создать утилиту computeDelta**

Создать файл `frontend/src/utils/reviewDelta.ts`:

```typescript
import type { PreviousSnapshot, ReviewSummary } from '../api/review'

export interface MetricDelta {
  current: number
  previous: number
  delta: number
  improved: boolean
}

const HEALTH_ORDER: Record<string, number> = {
  ok: 3,
  attention: 2,
  problems: 1,
}

export function computeDeltas(
  summary: ReviewSummary,
  previous: PreviousSnapshot,
): Record<string, MetricDelta> {
  const metrics: Record<string, { current: number; previous: number; lowerIsBetter: boolean }> = {
    inbox: { current: summary.inbox_count, previous: previous.inbox_count, lowerIsBetter: true },
    overdue: { current: summary.overdue_count, previous: previous.overdue_count, lowerIsBetter: true },
    done: { current: summary.done_this_week, previous: previous.done_count, lowerIsBetter: false },
    stale: { current: summary.stale_count, previous: previous.stale_count, lowerIsBetter: true },
    projects_without_next: {
      current: summary.projects_without_next,
      previous: previous.projects_without_next,
      lowerIsBetter: true,
    },
  }

  const result: Record<string, MetricDelta> = {}
  for (const [key, m] of Object.entries(metrics)) {
    const delta = m.current - m.previous
    result[key] = {
      current: m.current,
      previous: m.previous,
      delta,
      improved: m.lowerIsBetter ? delta < 0 : delta > 0,
    }
  }
  return result
}

export function computeHealthDelta(
  current: string,
  previous: string,
): { delta: number; improved: boolean } {
  const delta = (HEALTH_ORDER[current] ?? 0) - (HEALTH_ORDER[previous] ?? 0)
  return { delta, improved: delta > 0 }
}
```

- [ ] **Step 4: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors

---

### Task 4: i18n — ключи для дельты

**Files:**
- Modify: `frontend/src/i18n/locales/ru/review.json`
- Modify: `frontend/src/i18n/locales/en/review.json`

- [ ] **Step 1: Добавить ключи в ru/review.json**

Добавить в конец JSON (перед последней `}`), после `"overdueSetDate"`:

```json
  "comparisonTitle": "Сравнение с прошлым обзором",
  "comparisonPreviousDate": "Прошлый обзор: {{date}}",
  "deltaUp": "↑",
  "deltaDown": "↓",
  "deltaNoChange": "—"
```

(не забыть запятую после `"overdueSetDate": "Перенести"`)

- [ ] **Step 2: Добавить ключи в en/review.json**

Аналогично после `"overdueSetDate"`:

```json
  "comparisonTitle": "Compared to last review",
  "comparisonPreviousDate": "Last review: {{date}}",
  "deltaUp": "↑",
  "deltaDown": "↓",
  "deltaNoChange": "—"
```

- [ ] **Step 3: Проверить что JSON валидный**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/ru/review.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en/review.json','utf8')); console.log('OK')"`
Expected: OK

---

### Task 5: Frontend — дельта на Dashboard

**Files:**
- Modify: `frontend/src/components/review/ReviewDashboard.tsx`

- [ ] **Step 1: Добавить импорт computeDeltas**

Вверху файла, добавить:

```typescript
import { computeDeltas } from '../../utils/reviewDelta'
```

- [ ] **Step 2: Модифицировать MetricCard для показа дельты**

Заменить компонент `MetricCard`:

```tsx
function DeltaIndicator({ delta }: { delta: number | undefined; improved: boolean }) {
  if (delta === undefined || delta === 0) {
    if (delta === 0) {
      return <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
    }
    return null
  }
  const isUp = delta > 0
  const color = improved
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {isUp ? '↑' : '↓'}{Math.abs(delta)}
    </span>
  )
}

function MetricCard({
  value,
  label,
  color,
  delta,
  improved,
}: {
  value: number
  label: string
  color: string
  delta?: number
  improved?: boolean
}) {
  return (
    <div className={`rounded-lg p-4 text-center ${color}`}>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-2xl font-bold">{value}</span>
        <DeltaIndicator delta={delta} improved={improved ?? false} />
      </div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  )
}
```

- [ ] **Step 3: Вычислить дельты и передать в MetricCard**

В компоненте `ReviewDashboard`, после `if (!summary) return null` (строка ~96), добавить:

```tsx
  const deltas = summary.previous_snapshot ? computeDeltas(summary, summary.previous_snapshot) : null
```

Заменить блок `grid grid-cols-4` с MetricCard'ами (строки 106-127) на:

```tsx
      <div className="grid grid-cols-4 gap-3 w-full mb-4">
        <MetricCard
          value={summary.inbox_count}
          label={t('dashboardInbox')}
          color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
          delta={deltas?.inbox?.delta}
          improved={deltas?.inbox?.improved}
        />
        <MetricCard
          value={summary.overdue_count}
          label={t('dashboardOverdue')}
          color="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          delta={deltas?.overdue?.delta}
          improved={deltas?.overdue?.improved}
        />
        <MetricCard
          value={summary.done_this_week}
          label={t('dashboardDone')}
          color="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
          delta={deltas?.done?.delta}
          improved={deltas?.done?.improved}
        />
        <MetricCard
          value={summary.stale_count}
          label={t('dashboardStale')}
          color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
          delta={deltas?.stale?.delta}
          improved={deltas?.stale?.improved}
        />
      </div>
```

- [ ] **Step 4: Проверить TypeScript и ESLint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: 0 errors

---

### Task 6: Frontend — блок сравнения на Completion

**Files:**
- Modify: `frontend/src/components/review/ReviewCompletion.tsx`

- [ ] **Step 1: Добавить импорты**

Вверху файла добавить:

```typescript
import { computeDeltas, computeHealthDelta } from '../../utils/reviewDelta'
import type { PreviousSnapshot } from '../../api/review'
```

- [ ] **Step 2: Добавить блок сравнения**

В компоненте `ReviewCompletion`, после `const healthBefore = summary?.health_status ?? null` (строка ~49), добавить:

```tsx
  const previous = summary?.previous_snapshot
  const deltas = previous && summary ? computeDeltas(summary, previous) : null
  const healthDelta = previous && healthBefore ? computeHealthDelta(healthBefore, previous.health_status) : null
```

Заменить блок health before/after (строки 87-93) на расширенный блок сравнения:

```tsx
      {previous && deltas && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 w-full max-w-md mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t('comparisonTitle')}
          </div>
          <div className="space-y-1.5">
            {[
              { key: 'inbox', label: t('dashboardInbox') },
              { key: 'overdue', label: t('dashboardOverdue') },
              { key: 'done', label: t('dashboardDone') },
              { key: 'stale', label: t('dashboardStale') },
            ].map(({ key, label }) => {
              const d = deltas[key]
              if (!d || d.delta === 0) return null
              const isUp = d.delta > 0
              const color = d.improved
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                  <span className={color}>
                    {d.previous} → {d.current} ({isUp ? '↑' : '↓'}{Math.abs(d.delta)})
                  </span>
                </div>
              )
            })}
            {healthDelta && healthDelta.delta !== 0 && healthBefore && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Health</span>
                <span className={healthDelta.improved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {previous.health_status} → {healthBefore}
                </span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {t('comparisonPreviousDate', { date: new Date(previous.created_at).toLocaleDateString() })}
          </div>
        </div>
      )}
```

- [ ] **Step 3: Проверить TypeScript и ESLint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: 0 errors

---

### Task 7: Обновить docs/features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Добавить информацию о сравнении**

В секцию "Weekly Review — Insight-Driven Fast Review" после строки `- **Skip:**` добавить:

```markdown
- **Сравнение с предыдущим обзором:** Дельта метрик (inbox/overdue/done/stale) на Dashboard (стрелки ↑↓) и на Completion (блок сравнения). Backend: previous_snapshot в /review/summary из review_snapshots. Утилита: computeDeltas в frontend/src/utils/reviewDelta.ts
```

- [ ] **Step 2: Финальная проверка всех линтеров**

Run: `cd backend && ruff check . && cd ../frontend && npx tsc --noEmit && npm run lint`
Expected: All passed, 0 errors

- [ ] **Step 3: Коммит**

```bash
git add -A && git commit -m "feat: add review history comparison with previous snapshot"
```
