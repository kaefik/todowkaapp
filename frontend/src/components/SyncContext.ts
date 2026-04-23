import { createContext, useContext } from 'react'

export interface SyncContextValue {
  isSyncing: boolean
  pendingCount: number
  lastSyncAt: Date | null
  isOnline: boolean
}

export const SyncContext = createContext<SyncContextValue>({
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  isOnline: true,
})

export function useSyncStatus(): SyncContextValue {
  return useContext(SyncContext)
}
