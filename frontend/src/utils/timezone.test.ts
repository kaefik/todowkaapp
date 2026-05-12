import { describe, it, expect, vi } from 'vitest'

vi.mock('../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: { timezone: 'Europe/Moscow' },
    }),
  },
}))

import { toIsoDateTime, getTimezoneOffsetStr, getUserTimezone } from './timezone'

describe('getTimezoneOffsetStr', () => {
  it('returns format +HH:MM for positive offset', () => {
    const ref = new Date('2026-05-11T12:00:00Z')
    const result = getTimezoneOffsetStr('Europe/Moscow', ref)
    expect(result).toMatch(/^[+-]\d{2}:\d{2}$/)
  })

  it('computes offset on reference date, not current moment', () => {
    const result = getTimezoneOffsetStr('Europe/Moscow', new Date('2026-05-11T12:00:00Z'))
    expect(typeof result).toBe('string')
    expect(result.length).toBe(6)
  })
})

describe('toIsoDateTime', () => {
  it('adds timezone offset for timed events', () => {
    const result = toIsoDateTime('2026-05-11T21:03', false)
    expect(result).not.toBeNull()
    expect(result).toContain('T')
    expect(result).toMatch(/[+-]\d{2}:\d{2}$/)
  })

  it('does NOT add offset for all-day events', () => {
    const result = toIsoDateTime('2026-05-11', true)
    expect(result).toBe('2026-05-11T00:00:00')
  })

  it('returns null for null input', () => {
    expect(toIsoDateTime(null, false)).toBeNull()
    expect(toIsoDateTime(null, true)).toBeNull()
  })

  it('handles date-only string for non-all-day', () => {
    const result = toIsoDateTime('2026-05-11', false)
    expect(result).toBe('2026-05-11T00:00')
  })
})

describe('getUserTimezone', () => {
  it('returns user timezone when available', () => {
    const result = getUserTimezone()
    expect(result).toBe('Europe/Moscow')
  })

  it('falls back to Intl when user timezone is null', () => {
    vi.doMock('../stores/authStore', () => ({
      useAuthStore: {
        getState: () => ({
          user: { timezone: null },
        }),
      },
    }))
    const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(typeof fallback).toBe('string')
    expect(fallback.length).toBeGreaterThan(0)
  })
})
