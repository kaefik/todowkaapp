import { useState, useCallback, useRef } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  delay?: number
  threshold?: number
}

export function useLongPress({ onLongPress, delay = 400, threshold = 10 }: UseLongPressOptions) {
  const [isLongPressing, setIsLongPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const pos = 'touches' in e 
      ? { x: e.touches[0]?.clientX ?? 0, y: e.touches[0]?.clientY ?? 0 }
      : { x: e.clientX, y: e.clientY }
    startPosRef.current = pos
    setIsLongPressing(false)
    
    timerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      if (navigator.vibrate) navigator.vibrate(10)
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsLongPressing(false)
  }, [])

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current || timerRef.current === null) return
    
    const pos = 'touches' in e 
      ? { x: e.touches[0]?.clientX ?? 0, y: e.touches[0]?.clientY ?? 0 }
      : { x: e.clientX, y: e.clientY }
    const startPos = startPosRef.current!
    const dx = Math.abs(pos.x - startPos.x)
    const dy = Math.abs(pos.y - startPos.y)
    
    if (dx > threshold || dy > threshold) {
      cancel()
    }
  }, [cancel, threshold])

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onMouseMove: move,
    isLongPressing,
  }
}