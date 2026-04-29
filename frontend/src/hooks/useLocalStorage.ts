import { useState, useEffect } from 'react'

function dispatchLocalStorageEvent(key: string, value: unknown) {
  window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key, value } }))
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  useEffect(() => {
    const handler = (e: Event) => {
      const { key: eventKey, value: eventValue } = (e as CustomEvent).detail
      if (eventKey === key) {
        setStoredValue(eventValue)
      }
    }
    window.addEventListener('local-storage-change', handler)
    return () => window.removeEventListener('local-storage-change', handler)
  }, [key])

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
      dispatchLocalStorageEvent(key, valueToStore)
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}
