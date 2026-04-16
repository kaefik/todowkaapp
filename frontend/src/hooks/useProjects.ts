import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  refetch: () => Promise<unknown>
}

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
}

export function useProjects(): UseProjectsReturn {
  const queryClient = useQueryClient()

  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const response = await httpClient.get<{ items: Project[]; total: number }>('/projects')
      return response.data.items
    },
    staleTime: 1000 * 60 * 5,
  })

  const addProjectMutation = useMutation({
    mutationFn: async (data: CreateProject) => {
      const response = await httpClient.post<Project>('/projects', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProject }) => {
      const response = await httpClient.put<Project>(`/projects/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/projects/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })

  const addProject = async (data: CreateProject) => {
    try {
      await addProjectMutation.mutateAsync(data)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось создать проект')
    }
  }

  const updateProject = async (id: string, data: UpdateProject) => {
    try {
      await updateProjectMutation.mutateAsync({ id, data })
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось обновить проект')
    }
  }

  const deleteProject = async (id: string) => {
    try {
      await deleteProjectMutation.mutateAsync(id)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Не удалось удалить проект')
    }
  }

  return {
    projects,
    isLoading,
    error: error instanceof Error ? error.message : null,
    addProject,
    updateProject,
    deleteProject,
    refetch,
  }
}
