import { useEffect, useState, useCallback, useRef } from 'react'
import { setQueueMutationFn } from '../api/httpClient'
import { clearAllLocalTaskChanges } from '../lib/localTaskChanges'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

interface QueuedMutation {
  id: string
  method: 'POST' | 'PUT' | 'DELETE'
  url: string
  body?: unknown
  timestamp: number
}

const DB_NAME = 'todowka-offline'
const DB_VERSION = 1
const STORE_NAME = 'mutations'

let db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    db = await openDB()
  }
  return db
}

async function addMutation(mutation: QueuedMutation): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(mutation)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function getAllMutations(): Promise<QueuedMutation[]> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function deleteMutation(id: string): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearMutations(): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueSize, setQueueSize] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const isSyncingRef = useRef(false)
  const syncQueueRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline) {
      syncQueueRef.current?.()
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_SYNC' })
      }
    }
  }, [isOnline])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_QUEUE' && isOnline) {
        syncQueueRef.current?.()
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [isOnline])

  const updateQueueSize = useCallback(async () => {
    const mutations = await getAllMutations()
    setQueueSize(mutations.length)
  }, [])

  useEffect(() => {
    updateQueueSize()
  }, [updateQueueSize])

  const queueMutation = useCallback(async (mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) => {
    const queuedMutation: QueuedMutation = {
      ...mutation,
      id: `${mutation.method}-${mutation.url}-${Date.now()}`,
      timestamp: Date.now(),
    }

    await addMutation(queuedMutation)
    await updateQueueSize()

    if (!isOnline) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_SYNC' })
      }
    }
  }, [isOnline, updateQueueSize])

  useEffect(() => {
    console.log('[OfflineQueue] Initializing queueMutationFn')
    setQueueMutationFn(async (mutation) => {
      console.log('[OfflineQueue] Queue mutation:', mutation)
      await queueMutation({
        method: mutation.method,
        url: mutation.url,
        body: mutation.body ? JSON.parse(mutation.body) : undefined,
      })
    })
  }, [queueMutation])

  const syncQueue = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return
    
    isSyncingRef.current = true
    setIsSyncing(true)
    
    try {
      const mutations = await getAllMutations()
      const sortedMutations = mutations.sort((a, b) => a.timestamp - b.timestamp)
      
      let allSynced = true
      for (const mutation of sortedMutations) {
        try {
          const authStore = useAuthStore.getState()
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (authStore.accessToken) {
            headers['Authorization'] = `Bearer ${authStore.accessToken}`
          }
          const fullUrl = mutation.url.startsWith('http') ? mutation.url : `${API_BASE_URL}${mutation.url}`
          const response = await fetch(fullUrl, {
            method: mutation.method,
            headers,
            body: mutation.body ? JSON.stringify(mutation.body) : undefined,
          })
          if (!response.ok) {
            allSynced = false
            break
          }
          await deleteMutation(mutation.id)
        } catch (error) {
          console.error('Failed to sync mutation:', mutation, error)
          allSynced = false
          break
        }
      }
      
      if (allSynced) {
        await clearAllLocalTaskChanges()
        console.log('[OfflineQueue] All mutations synced, cleared local task changes')
      }
      
      await updateQueueSize()
    } catch (error) {
      console.error('Failed to sync queue:', error)
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }, [isOnline, updateQueueSize])

  syncQueueRef.current = syncQueue

  const clearQueue = useCallback(async () => {
    await clearMutations()
    await updateQueueSize()
  }, [updateQueueSize])

  return {
    isOnline,
    queueSize,
    isSyncing,
    queueMutation,
    syncQueue: () => syncQueueRef.current?.(),
    clearQueue,
  }
}
