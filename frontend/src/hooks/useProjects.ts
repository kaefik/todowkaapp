import { useState, useEffect, useCallback } from 'react'
import { httpClient, ApiError } from '../api/httpClient'

export interface ProjectProgress {
  tasks_total: number
  tasks_completed: number
  progress_percent: number
}

export interface Project {
  id: string
  name: string
  description: string | null
  color: string | null
  area_id: string | null
  is_active: boolean
  user_id: string
  progress: ProjectProgress
  created_at: string
  updated_at: string
}

export interface CreateProject {
  name: string
  description?: string | null
  color?: string | null
  area_id?: string | null
}

export interface UpdateProject {
  name?: string
  description?: string | null
  color?: string | null
  area_id?: string | null
  is_active?: boolean
}

interface UseProjectsReturn {
  projects: Project[]
  isLoading: boolean
  error: string | null
  addProject: (data: CreateProject) => Promise<void>
  updateProject: (id: string, data: UpdateProject) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<{ items: Project[]; total: number }>('/projects')
      setProjects(response.data.items)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить проекты')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const addProject = useCallback(async (data: CreateProject) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.post<Project>('/projects', data)
      await refetch()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось создать проект')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refetch])

  const updateProject = useCallback(async (id: string, data: UpdateProject) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.put<Project>(`/projects/${id}`, data)
      await refetch()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось обновить проект')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refetch])

  const deleteProject = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.delete(`/projects/${id}`)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Не удалось удалить проект')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    projects,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    refetch,
  }
}
