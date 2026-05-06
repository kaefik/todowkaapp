import { useState, useEffect } from 'react'
import { getTgTheme, getColorScheme, type TgThemeParams } from './WebApp'

export function useTgTheme() {
  const [themeParams, setThemeParams] = useState<TgThemeParams>(getTgTheme)
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>(getColorScheme)

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeParams(getTgTheme())
      setColorScheme(getColorScheme())
    }
    
    if (window.Telegram?.themeParams) {
      window.addEventListener('themeChanged', handleThemeChange)
    }
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
    }
  }, [])

  return {
    themeParams,
    colorScheme,
    isDark: colorScheme === 'dark'
  }
}