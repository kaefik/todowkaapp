import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const POPULAR_TIMEZONES = [
  'Europe/Moscow',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Kiev',
  'Europe/Kaliningrad',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
  'Australia/Sydney',
]

function getTimezoneOffset(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(new Date())
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')
    return offsetPart?.value ?? ''
  } catch {
    return ''
  }
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Europe/Moscow'
  }
}

interface OnboardingTimezoneProps {
  onSelect: (timezone: string) => void
}

export function OnboardingTimezone({ onSelect }: OnboardingTimezoneProps) {
  const { t } = useTranslation('onboarding')
  const detected = useMemo(() => detectTimezone(), [])
  const [timezone, setTimezone] = useState(detected)
  const [search, setSearch] = useState('')

  const allTimezones = useMemo(() => {
    const set = new Set([detected, ...POPULAR_TIMEZONES])
    try {
      const intl = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      if (intl.supportedValuesOf) {
        for (const tz of intl.supportedValuesOf('timeZone')) {
          set.add(tz)
        }
      }
    } catch {}
    return [...set].sort()
  }, [detected])

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q)).slice(0, 20)
  }, [search, allTimezones])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('stepTimezone')}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('stepTimezoneDesc')}
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 mb-4">
          <p className="text-sm text-green-700 dark:text-green-400">
            <span className="font-semibold">{t('detectedTimezone')}</span>{' '}
            {timezone} ({getTimezoneOffset(timezone)})
          </p>
        </div>

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('changeTimezone')}
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchTimezone')}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
        {filtered.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {filtered.map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => {
                  setTimezone(tz)
                  setSearch('')
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-900 dark:text-gray-100"
              >
                {tz} ({getTimezoneOffset(tz)})
              </button>
            ))}
          </div>
        )}

        <div className="mt-3">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          >
            {POPULAR_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz} ({getTimezoneOffset(tz)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(timezone)}
        className="mt-4 rounded-lg bg-indigo-600 dark:bg-indigo-500 px-8 py-3 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
      >
        {t('next')}
      </button>
    </div>
  )
}
