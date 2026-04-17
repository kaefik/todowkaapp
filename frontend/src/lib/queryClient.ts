import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { openDB } from 'idb'
import { OfflineQueueError } from '../api/httpClient'

let dbPromise: Promise<import('idb').IDBPDatabase> | null = null

async function resetIndexedDB(): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('todowka-query-cache')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    console.warn('[IndexedDB] Cache database reset successfully')
  } catch (error) {
    console.error('[IndexedDB] Failed to reset database:', error)
    throw error
  }
}

function getDB(): Promise<import('idb').IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB('todowka-query-cache', 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache')
          }

          const oldStores = Array.from(db.objectStoreNames).filter(store => store !== 'cache')

          if (oldStores.length > 0) {
            const cacheStore = transaction.objectStore('cache')

            oldStores.forEach(storeName => {
              const oldStore = transaction.objectStore(storeName)
              oldStore.openCursor().then(cursor => {
                return new Promise<void>((resolve, reject) => {
                  const processNext = () => {
                    if (!cursor) {
                      resolve()
                      return
                    }

                    cacheStore.put(cursor.value, cursor.key)
                    cursor.continue().then(processNext).catch(reject)
                  }
                  processNext()
                })
              }).catch(err => {
                console.error(`Failed to migrate data from ${storeName}:`, err)
              })
            })
          }

          transaction.oncomplete = () => {
            const currentStores = Array.from(db.objectStoreNames)
            oldStores.forEach(storeName => {
              if (currentStores.includes(storeName)) {
                db.deleteObjectStore(storeName)
                console.log(`Deleted old object store: ${storeName}`)
              }
            })
          }

          transaction.onerror = (event) => {
            console.error('IndexedDB migration failed:', event)
          }
        }
      },
    })
  }
  return dbPromise
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof OfflineQueueError) return false
        return failureCount < 1
      },
      retryDelay: 1000,
    },
  },
})

async function initializePersister() {
  try {
    const asyncStoragePersister = createAsyncStoragePersister({
      storage: {
        getItem: async (key) => {
          const db = await getDB()
          return db.get('cache', key)
        },
        setItem: async (key, value) => {
          const db = await getDB()
          await db.put('cache', value, key)
        },
        removeItem: async (key) => {
          const db = await getDB()
          await db.delete('cache', key)
        },
      },
    })

    persistQueryClient({
      queryClient,
      persister: asyncStoragePersister,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    })

    console.log('[QueryClient] Persistence initialized successfully')
  } catch (error) {
    if (error instanceof DOMException || (error instanceof Error && error.name === 'VersionError')) {
      console.error('[QueryClient] IndexedDB error:', error)

      try {
        await resetIndexedDB()

        dbPromise = null

        const asyncStoragePersister = createAsyncStoragePersister({
          storage: {
            getItem: async (key) => {
              const db = await getDB()
              return db.get('cache', key)
            },
            setItem: async (key, value) => {
              const db = await getDB()
              await db.put('cache', value, key)
            },
            removeItem: async (key) => {
              const db = await getDB()
              await db.delete('cache', key)
            },
          },
        })

        persistQueryClient({
          queryClient,
          persister: asyncStoragePersister,
          maxAge: 1000 * 60 * 60 * 24 * 7,
        })

        console.log('[QueryClient] Persistence re-initialized after reset')
      } catch (resetError) {
        console.error('[QueryClient] Failed to reset and re-initialize persistence:', resetError)
        console.warn('[QueryClient] Running without persistence')
      }
    } else {
      console.error('[QueryClient] Unexpected error initializing persistence:', error)
      console.warn('[QueryClient] Running without persistence')
    }
  }
}

initializePersister()
