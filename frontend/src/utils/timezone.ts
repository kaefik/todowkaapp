import { useAuthStore } from '../stores/authStore'

export function getUserTimezone(): string {
  const user = useAuthStore.getState().user
  return user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getTimezoneOffsetStr(timezone?: string, referenceDate?: Date): string {
  const tz = timezone || getUserTimezone()
  const ref = referenceDate || new Date()
  const utcStr = ref.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = ref.toLocaleString('en-US', { timeZone: tz })
  const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime()
  const offsetMin = offsetMs / (60 * 1000)
  const sign = offsetMin >= 0 ? '+' : '-'
  const absOffset = Math.abs(offsetMin)
  const h = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const m = String(absOffset % 60).padStart(2, '0')
  return `${sign}${h}:${m}`
}

export function toIsoDateTime(value: string | null, isAllDay: boolean): string | null {
  if (!value) return null
  if (isAllDay) {
    return value + 'T00:00:00'
  }
  if (value.includes('T')) {
    const refDate = new Date(value)
    const offset = getTimezoneOffsetStr(undefined, refDate)
    return value + ':00' + offset
  }
  return value + 'T00:00'
}
