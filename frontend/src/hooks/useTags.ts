import { useState, useEffect, useCallback } from 'react'
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
  refetch: () => Promise<void>
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<{ items: Tag[]; total: number }>('/tags')
      setTags(response.data.items)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить теги')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const addTag = useCallback(async (data: CreateTag) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.post<Tag>('/tags', data)
      setTags((prev) => [...prev, response.data])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось создать тег')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateTag = useCallback(async (id: string, data: UpdateTag) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.put<Tag>(`/tags/${id}`, data)
      setTags((prev) =>
        prev.map((tag) => (tag.id === id ? response.data : tag))
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось обновить тег')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteTag = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.delete(`/tags/${id}`)
      setTags((prev) => prev.filter((tag) => tag.id !== id))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось удалить тег')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    tags,
    isLoading,
    error,
    addTag,
    updateTag,
    deleteTag,
    refetch,
  }
}
