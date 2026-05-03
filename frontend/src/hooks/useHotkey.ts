import { useEffect, useCallback } from 'react'

interface HotkeyOptions {
  code: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  preventDefault?: boolean
  enabled?: boolean
}

export function useHotkey(options: HotkeyOptions, callback: () => void) {
  const {
    code,
    ctrl = false,
    meta = false,
    shift = false,
    alt = false,
    preventDefault = true,
    enabled = true,
  } = options

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const ctrlOrMeta = ctrl || meta
      const ctrlMatch = ctrlOrMeta ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey
      const altMatch = alt ? e.altKey : !e.altKey

      if (e.code === code && ctrlMatch && shiftMatch && altMatch) {
        if (preventDefault) e.preventDefault()
        callback()
      }
    },
    [code, ctrl, meta, shift, alt, preventDefault, enabled, callback],
  )

  useEffect(() => {
    if (!enabled) return
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handler, enabled])
}
