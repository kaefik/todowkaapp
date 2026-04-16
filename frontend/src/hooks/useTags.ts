import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient, ApiError } from '../api/httpClient'

export interface Tag {
  id: string
  name: string
  color: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateTag {
  name: string
  color?: string | null
}

export interface UpdateTag {
  name?: string
  color?: string | null
}

interface UseTagsReturn {
  tags: Tag[]
  isLoading: boolean
  error: string | null
  addTag: (data: CreateTag) => Promise<void>
  updateTag: (id: string, data: UpdateTag) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  refetch: () => Promise<unknown>
}

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  detail: (id: string) => [...tagKeys.all, 'detail', id] as const,
}

export function useTags(): UseTagsReturn {
  const queryClient = useQueryClient()

  const { data: tags = [], isLoading, error, refetch } = useQuery({
    queryKey: tagKeys.lists(),
    queryFn: async () => {
      const response = await httpClient.get<{ items: Tag[]; total: number }>('/tags')
      return response.data.items
    },
    staleTime: 1000 * 60 * 10,
  })

  const addTagMutation = useMutation({
    mutationFn: async (data: CreateTag) => {
      const response = await httpClient.post<Tag>('/tags', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTag }) => {
      const response = await httpClient.put<Tag>(`/tags/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/tags/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
    },
  })

  const addTag = async (data: CreateTag) => {
    try {
      await addTagMutation.mutateAsync(data)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось создать тег')
    }
  }

  const updateTag = async (id: string, data: UpdateTag) => {
    try {
      await updateTagMutation.mutateAsync({ id, data })
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось обновить тег')
    }
  }

  const deleteTag = async (id: string) => {
    try {
      await deleteTagMutation.mutateAsync(id)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось удалить тег')
    }
  }

  return {
    tags,
    isLoading,
    error: error instanceof Error ? error.message : null,
    addTag,
    updateTag,
    deleteTag,
    refetch,
  }
}
