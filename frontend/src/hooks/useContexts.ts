import { useState, useEffect, useCallback } from 'react'
import { httpClient, ApiError } from '../api/httpClient'

export interface Context {
  id: string
  name: string
  color: string | null
  icon: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateContext {
  name: string
  color?: string | null
  icon?: string | null
}

export interface UpdateContext {
  name?: string
  color?: string | null
  icon?: string | null
}

interface UseContextsReturn {
  contexts: Context[]
  isLoading: boolean
  error: string | null
  addContext: (data: CreateContext) => Promise<void>
  updateContext: (id: string, data: UpdateContext) => Promise<void>
  deleteContext: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useContexts(): UseContextsReturn {
  const [contexts, setContexts] = useState<Context[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<{ items: Context[]; total: number }>('/contexts')
      setContexts(response.data.items)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить контексты')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const addContext = useCallback(async (data: CreateContext) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.post<Context>('/contexts', data)
      setContexts((prev) => [...prev, response.data])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось создать контекст')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateContext = useCallback(async (id: string, data: UpdateContext) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.put<Context>(`/contexts/${id}`, data)
      setContexts((prev) =>
        prev.map((ctx) => (ctx.id === id ? response.data : ctx))
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось обновить контекст')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteContext = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.delete(`/contexts/${id}`)
      setContexts((prev) => prev.filter((ctx) => ctx.id !== id))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось удалить контекст')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    contexts,
    isLoading,
    error,
    addContext,
    updateContext,
    deleteContext,
    refetch,
  }
}
