import { useCallback } from 'react'

export interface HapticFeedback {
  impact: (style: 'light' | 'medium' | 'heavy') => void
  notification: (type: 'success' | 'warning' | 'error') => void
  selection: () => void
}

export function useHaptic(): HapticFeedback {
  const impact = useCallback((style: 'light' | 'medium' | 'heavy') => {
    if (window.Telegram?.HapticFeedback) {
      window.Telegram.HapticFeedback.impactOccurred(style)
    }
  }, [])

  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    if (window.Telegram?.HapticFeedback) {
      window.Telegram.HapticFeedback.notificationOccurred(type)
    }
  }, [])

  const selection = useCallback(() => {
    if (window.Telegram?.HapticFeedback) {
      window.Telegram.HapticFeedback.selectionChanged()
    }
  }, [])

  return { impact, notification, selection }
}

export function useTgMainButton() {
  const show = useCallback((text: string, onClick: () => void) => {
    if (window.Telegram?.MainButton) {
      window.Telegram.MainButton.setText(text)
      window.Telegram.MainButton.onClick(onClick)
      window.Telegram.MainButton.show()
    }
  }, [])

  const hide = useCallback(() => {
    if (window.Telegram?.MainButton) {
      window.Telegram.MainButton.hide()
    }
  }, [])

  return { show, hide }
}

export function useTgBackButton(onClick: () => void) {
  const show = useCallback(() => {
    if (window.Telegram?.BackButton) {
      window.Telegram.BackButton.show()
    }
  }, [])

  const hide = useCallback(() => {
    if (window.Telegram?.BackButton) {
      window.Telegram.BackButton.hide()
    }
  }, [])

  if (window.Telegram?.BackButton) {
    window.Telegram.BackButton.onClick(onClick)
    window.Telegram.BackButton.show()
  }

  return { show, hide }
}