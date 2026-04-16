import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient, ApiError } from '../api/httpClient'

export interface Area {
  id: string
  name: string
  description: string | null
  color: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateArea {
  name: string
  description?: string | null
  color?: string | null
}

export interface UpdateArea {
  name?: string
  description?: string | null
  color?: string | null
}

interface UseAreasReturn {
  areas: Area[]
  isLoading: boolean
  error: string | null
  addArea: (data: CreateArea) => Promise<void>
  updateArea: (id: string, data: UpdateArea) => Promise<void>
  deleteArea: (id: string) => Promise<void>
  refetch: () => Promise<unknown>
}

export const areaKeys = {
  all: ['areas'] as const,
  lists: () => [...areaKeys.all, 'list'] as const,
  detail: (id: string) => [...areaKeys.all, 'detail', id] as const,
}

export function useAreas(): UseAreasReturn {
  const queryClient = useQueryClient()

  const { data: areas = [], isLoading, error, refetch } = useQuery({
    queryKey: areaKeys.lists(),
    queryFn: async () => {
      const response = await httpClient.get<{ items: Area[]; total: number }>('/areas')
      return response.data.items
    },
    staleTime: 1000 * 60 * 10,
  })

  const addAreaMutation = useMutation({
    mutationFn: async (data: CreateArea) => {
      const response = await httpClient.post<Area>('/areas', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() })
    },
  })

  const updateAreaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateArea }) => {
      const response = await httpClient.put<Area>(`/areas/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: areaKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() })
    },
  })

  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/areas/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() })
    },
  })

  const addArea = async (data: CreateArea) => {
    try {
      await addAreaMutation.mutateAsync(data)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось создать область')
    }
  }

  const updateArea = async (id: string, data: UpdateArea) => {
    try {
      await updateAreaMutation.mutateAsync({ id, data })
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось обновить область')
    }
  }

  const deleteArea = async (id: string) => {
    try {
      await deleteAreaMutation.mutateAsync(id)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось удалить область')
    }
  }

  return {
    areas,
    isLoading,
    error: error instanceof Error ? error.message : null,
    addArea,
    updateArea,
    deleteArea,
    refetch,
  }
}
