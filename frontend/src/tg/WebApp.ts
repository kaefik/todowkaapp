export interface TgThemeParams {
  button_color?: string
  button_text_color?: string
  bg_color?: string
  text_color?: string
  hint_color?: string
  secondary_bg_color?: string
}

export interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  MainButton: {
    show: () => void
    hide: () => void
    setText: (text: string) => void
    onClick: (cb: () => void) => void
    isVisible: boolean
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    isVisible: boolean
  }
  themeParams: TgThemeParams
  colorScheme: 'dark' | 'light'
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    query_id?: string
    auth_date?: number
    hash?: string
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'success' | 'warning' | 'error') => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: TelegramWebApp
  }
}

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram
}

export function initTelegram(): void {
  if (window.Telegram) {
    window.Telegram.ready()
    window.Telegram.expand()
  }
}

export function getTgTheme(): TgThemeParams {
  if (window.Telegram?.themeParams) {
    return window.Telegram.themeParams
  }
  return {
    button_color: '#5c6bc0',
    button_text_color: '#ffffff',
    bg_color: '#ffffff',
    text_color: '#000000',
    hint_color: '#666666',
    secondary_bg_color: '#f5f5f5'
  }
}

export function getColorScheme(): 'dark' | 'light' {
  return window.Telegram?.colorScheme || 'light'
}

export function getInitData(): string {
  return window.Telegram?.initDataUnsafe?.hash ? window.Telegram.initData : ''
}

export function closeTelegram(): void {
  window.Telegram?.close()
}