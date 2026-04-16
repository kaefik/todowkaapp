import { QueryClient, persistQueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { openDB } from 'idb'

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
      retry: 1,
      retryDelay: 1000,
    },
  },
})

const asyncStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const db = await openDB('todowka-query-cache', 1)
      return db.get('cache', key)
    },
    setItem: async (key, value) => {
      const db = await openDB('todowka-query-cache', 1)
      await db.put('cache', value, key)
    },
    removeItem: async (key) => {
      const db = await openDB('todowka-query-cache', 1)
      await db.delete('cache', key)
    },
  },
})

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7,
})
