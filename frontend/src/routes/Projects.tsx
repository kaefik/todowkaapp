import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProjects, type Project } from '../hooks/useProjects'

const projectSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200, 'Максимум 200 символов'),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

function ProgressBar({ percent, color }: { percent: number; color: string | null }) {
  const bgColor = color || '#6366f1'
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-300"
        style={{ width: `${percent}%`, backgroundColor: bgColor }}
      />
    </div>
  )
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onClick,
}: {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onClick: (id: string) => void
}) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick(project.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {project.color ? (
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
          ) : (
            <span className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {project.name}
          </span>
          {!project.is_active && (
            <span className="text-xs text-gray-400 dark:text-gray-500">(архив)</span>
          )}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(project)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          >
            Ред.
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
          >
            Удалить
          </button>
        </div>
      </div>
      {project.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{project.description}</p>
      )}
      <div className="space-y-1">
        <ProgressBar
          percent={project.progress.progress_percent}
          color={project.color}
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{project.progress.tasks_completed} / {project.progress.tasks_total} задач</span>
          <span>{project.progress.progress_percent}%</span>
        </div>
      </div>
    </div>
  )
}

function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: Project | null
  onSubmit: (data: ProjectFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || null,
      color: initialData?.color || null,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              {...register('name')}
              type="text"
              placeholder="Название проекта"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm"
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>
          <div className="w-20">
            <input
              {...register('color')}
              type="text"
              placeholder="#FFF"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm"
            />
          </div>
        </div>
        <div>
          <input
            {...register('description')}
            type="text"
            placeholder="Описание (необязательно)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Сохранение...' : initialData ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}

function ProjectsContent() {
  const { projects, isLoading, error, addProject, updateProject, deleteProject, refetch } = useProjects()
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    try {
      await addProject(data)
      setIsCreating(false)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: ProjectFormData) => {
    if (!editingProject) return
    setIsSubmitting(true)
    try {
      await updateProject(editingProject.id, data)
      setEditingProject(null)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить проект? Задачи проекта будут отвязаны.')) return
    try {
      await deleteProject(id)
    } catch {
    }
  }

  const handleClickProject = (id: string) => {
    window.location.hash = `/projects/${id}`
  }

  if (isLoading && projects.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Проекты</h1>
        {!isCreating && !editingProject && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            + Новый проект
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {isCreating && (
        <ProjectForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {editingProject && (
        <ProjectForm
          initialData={editingProject}
          onSubmit={handleUpdate}
          onCancel={() => setEditingProject(null)}
          isSubmitting={isSubmitting}
        />
      )}

      {projects.length === 0 && !isLoading && !isCreating && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Нет проектов.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Создайте первый проект для организации задач
          </p>
        </div>
      )}

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={setEditingProject}
            onDelete={handleDelete}
            onClick={handleClickProject}
          />
        ))}
      </div>
    </div>
  )
}

export function Projects() {
  return <ProjectsContent />
}
