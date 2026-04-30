import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useBrowserNotifications } from './useBrowserNotifications'
import { show } from '../utils/browserNotifications'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'review-notification-shown-date'

export function useReviewNotifications() {
  const user = useAuthStore(s => s.user)
  const { enabled: notificationsEnabled } = useBrowserNotifications()
  const navigate = useNavigate()
  const { t } = useTranslation('review')

  useEffect(() => {
    if (!user) return
    if (!user.review_notifications_enabled) return
    if (!notificationsEnabled) return

    const lastReview = user.last_review_at
    if (!lastReview) return

    const daysSince = (Date.now() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < user.review_frequency_days) return

    const today = new Date().toDateString()
    const lastShown = localStorage.getItem(STORAGE_KEY)
    if (lastShown === today) return

    show({
      title: t('pushReviewTitle', { defaultValue: 'Время для еженедельного обзора' }),
      body: t('pushReviewBody', { defaultValue: 'Сделайте обзор ваших задач!' }),
      onClick: () => navigate('/review'),
    }).then(() => {
      localStorage.setItem(STORAGE_KEY, today)
    })
  }, [user, notificationsEnabled, navigate, t])
}