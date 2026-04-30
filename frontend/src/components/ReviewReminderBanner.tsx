import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { reviewApi } from '../api/review'
import { navigateWithTransition } from '../utils/navigation'

const SESSION_KEY = 'review-reminder-dismissed'
const SNOOZE_KEY = 'review-snoozed-until'

function getSnoozeDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function isSnoozed(): boolean {
  const snoozedUntil = localStorage.getItem(SNOOZE_KEY)
  if (!snoozedUntil) return false
  return new Date(snoozedUntil) > new Date()
}

function isMoreThanSevenDaysAgo(dateStr: string): boolean {
  const lastReview = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - lastReview.getTime()
  return diffMs > 7 * 24 * 60 * 60 * 1000
}

export function ReviewReminderBanner() {
  const { t } = useTranslation('nav')
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  const checkShouldShow = useCallback(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return false
    if (isSnoozed()) return false
    return true
  }, [])

  useEffect(() => {
    if (!checkShouldShow()) return

    reviewApi
      .getStatus()
      .then((status) => {
        if (!status.last_review_date || isMoreThanSevenDaysAgo(status.last_review_date)) {
          setShow(true)
        }
      })
      .catch(() => {})
  }, [checkShouldShow])

  const handleSnooze = useCallback((days: number) => {
    localStorage.setItem(SNOOZE_KEY, getSnoozeDate(days))
    setShow(false)
    sessionStorage.removeItem(SESSION_KEY)
  }, [])

  const handleStart = useCallback(() => {
    setShow(false)
    sessionStorage.setItem(SESSION_KEY, 'true')
    navigateWithTransition(navigate, '/review')
  }, [navigate])

  const handleDismiss = useCallback(() => {
    setShow(false)
    sessionStorage.setItem(SESSION_KEY, 'true')
  }, [])

  if (!show) return null

  return (
    <div className="mx-3 mb-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <svg
          className="h-4 w-4 mt-0.5 shrink-0 text-amber-500 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            {t('reviewReminder')}
          </p>
          <button
            onClick={handleStart}
            className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2"
          >
            {t('reviewStart')}
          </button>
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => handleSnooze(1)}
              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
            >
              {t('snooze1Day', { defaultValue: 'Завтра' })}
            </button>
            <button
              onClick={() => handleSnooze(3)}
              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
            >
              {t('snooze3Days', { defaultValue: 'Через 3 дня' })}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-amber-400 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}