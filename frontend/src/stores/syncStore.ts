import { create } from 'zustand'
import { sseSyncManager } from '../services/sseSyncManager'
import { useAuthStore } from './authStore'

export type SSESyncState = 'disconnected' | 'connecting' | 'connected' | 'error'

interface SyncEventData {
  type: 'task' | 'list' | 'reminder' | 'notification' | 'settings'
  action: 'created' | 'updated' | 'deleted'
  entity_id: string
  user_id: string
  timestamp: string
}

interface SyncState {
  sseState: SSESyncState
  isConnected: boolean
  lastSyncTimestamp: string | null
  
  startSSE: (userId: string) => void
  stopSSE: () => void
  handleSyncEvent: (data: SyncEventData) => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  sseState: 'disconnected',
  isConnected: false,
  lastSyncTimestamp: null,

  startSSE: (userId) => {
    set({ sseState: 'connecting' })
    const token = useAuthStore.getState().accessToken
    sseSyncManager.connect(userId, {
      onSync: (data) => {
        console.log('Sync event received:', data)
        get().handleSyncEvent(data as SyncEventData)
      },
      onStateChange: (state) => {
        console.log('SSE Sync state changed:', state)
        set({ 
          sseState: state,
          isConnected: state === 'connected'
        })
      },
      onError: (error) => {
        console.error('SSE Sync error:', error)
        set({ sseState: 'error', isConnected: false })
      },
    }, token || undefined)
  },

  stopSSE: () => {
    sseSyncManager.disconnect()
    set({ sseState: 'disconnected', isConnected: false })
  },

  handleSyncEvent: (data) => {
    console.log('Handling sync event:', data)
    set({ lastSyncTimestamp: data.timestamp })
    
    window.dispatchEvent(new CustomEvent('sync:event', {
      detail: data
    }))
  },
}))
