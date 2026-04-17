import { create } from 'zustand'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface SSEState {
  connectionStatus: ConnectionStatus
  reconnectAttempts: number
  lastAttemptTime: Date | null
  totalConnectedTime: number
  lastError: string | null
  currentConnectionStartTime: number | null
  updateStatus: (status: ConnectionStatus) => void
  incrementAttempts: () => void
  resetAttempts: () => void
  recordError: (error: string) => void
  recordConnectionStart: () => void
  recordConnectionEnd: () => void
}

export const useSSEStore = create<SSEState>((set, get) => ({
  connectionStatus: 'disconnected',
  reconnectAttempts: 0,
  lastAttemptTime: null,
  totalConnectedTime: 0,
  lastError: null,
  currentConnectionStartTime: null,

  updateStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status })
    
    if (status === 'connecting') {
      set({ lastAttemptTime: new Date() })
    } else if (status === 'connected') {
      const startTime = Date.now()
      set({ currentConnectionStartTime: startTime })
    } else if (status === 'disconnected' || status === 'error') {
      const { currentConnectionStartTime, totalConnectedTime } = get()
      if (currentConnectionStartTime) {
        const sessionDuration = Date.now() - currentConnectionStartTime
        set({ 
          totalConnectedTime: totalConnectedTime + sessionDuration,
          currentConnectionStartTime: null
        })
      }
    }
  },

  incrementAttempts: () => {
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }))
  },

  resetAttempts: () => {
    set({ reconnectAttempts: 0, lastError: null })
  },

  recordError: (error: string) => {
    set({ lastError: error })
  },

  recordConnectionStart: () => {
    set({ currentConnectionStartTime: Date.now() })
  },

  recordConnectionEnd: () => {
    const { currentConnectionStartTime, totalConnectedTime } = get()
    if (currentConnectionStartTime) {
      const sessionDuration = Date.now() - currentConnectionStartTime
      set({ 
        totalConnectedTime: totalConnectedTime + sessionDuration,
        currentConnectionStartTime: null
      })
    }
  },
}))
