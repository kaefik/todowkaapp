import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  refetch: () => Promise<unknown>
}

export const contextKeys = {
  all: ['contexts'] as const,
  lists: () => [...contextKeys.all, 'list'] as const,
  detail: (id: string) => [...contextKeys.all, 'detail', id] as const,
}

export function useContexts(): UseContextsReturn {
  const queryClient = useQueryClient()

  const { data: contexts = [], isLoading, error, refetch } = useQuery({
    queryKey: contextKeys.lists(),
    queryFn: async () => {
      const response = await httpClient.get<{ items: Context[]; total: number }>('/contexts')
      return response.data.items
    },
    staleTime: 1000 * 60 * 10,
  })

  const addContextMutation = useMutation({
    mutationFn: async (data: CreateContext) => {
      const response = await httpClient.post<Context>('/contexts', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextKeys.lists() })
    },
  })

  const updateContextMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateContext }) => {
      const response = await httpClient.put<Context>(`/contexts/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: contextKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: contextKeys.lists() })
    },
  })

  const deleteContextMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/contexts/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextKeys.lists() })
    },
  })

  const addContext = async (data: CreateContext) => {
    try {
      await addContextMutation.mutateAsync(data)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось создать контекст')
    }
  }

  const updateContext = async (id: string, data: UpdateContext) => {
    try {
      await updateContextMutation.mutateAsync({ id, data })
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось обновить контекст')
    }
  }

  const deleteContext = async (id: string) => {
    try {
      await deleteContextMutation.mutateAsync(id)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось удалить контекст')
    }
  }

  return {
    contexts,
    isLoading,
    error: error instanceof Error ? error.message : null,
    addContext,
    updateContext,
    deleteContext,
    refetch,
  }
}
