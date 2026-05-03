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
