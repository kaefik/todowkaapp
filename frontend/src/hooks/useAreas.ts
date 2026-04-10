import { useState, useEffect, useCallback } from 'react'
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
  refetch: () => Promise<void>
}

export function useAreas(): UseAreasReturn {
  const [areas, setAreas] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<{ items: Area[]; total: number }>('/areas')
      setAreas(response.data.items)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить области')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const addArea = useCallback(async (data: CreateArea) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.post<Area>('/areas', data)
      setAreas((prev) => [...prev, response.data])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось создать область')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateArea = useCallback(async (id: string, data: UpdateArea) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.put<Area>(`/areas/${id}`, data)
      setAreas((prev) =>
        prev.map((area) => (area.id === id ? response.data : area))
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось обновить область')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteArea = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.delete(`/areas/${id}`)
      setAreas((prev) => prev.filter((area) => area.id !== id))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось удалить область')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    areas,
    isLoading,
    error,
    addArea,
    updateArea,
    deleteArea,
    refetch,
  }
}
