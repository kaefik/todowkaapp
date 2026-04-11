import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Task, UpdateTask, GtdStatus } from '../hooks/useTasks'
import { useTasks } from '../hooks/useTasks'
import { useContexts } from '../hooks/useContexts'
import { useAreas } from '../hooks/useAreas'
import { useTags, type Tag } from '../hooks/useTags'
import { useProjects } from '../hooks/useProjects'

const GTD_STATUS_OPTIONS: { value: GtdStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'next', label: 'Next Action' },
  { value: 'waiting', label: 'Waiting For' },
  { value: 'someday', label: 'Someday / Maybe' },
  { value: 'completed', label: 'Completed' },
  { value: 'trash', label: 'Trash' },
]

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  context_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  area_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  project_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  gtd_status: z.string().optional(),
  due_date: z.string().nullable().optional().transform(v => v === '' ? null : v),
  notes: z.string().nullable().optional(),
})

type EditTaskFormData = z.infer<typeof editTaskSchema>

interface TaskEditModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: UpdateTask) => void
}

function TagChips({ tags, selectedTagIds, onToggle }: {
  tags: Tag[]
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isSelected
                ? 'text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            style={isSelected ? { backgroundColor: tag.color || '#6366f1' } : undefined}
          >
            {tag.name}
          </button>
        )
      })}
      {tags.length === 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Нет тегов. Создайте их на странице «Теги».
        </span>
      )}
    </div>
  )
}

export function TaskEditModal({ task, isOpen, onClose, onSave }: TaskEditModalProps) {
  const { fetchTask } = useTasks()
  const { contexts } = useContexts()
  const { areas } = useAreas()
  const { tags } = useTags()
  const { projects } = useProjects()
  const [currentTask, setCurrentTask] = useState<Task | null>(task)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema),
  })

  useEffect(() => {
    if (isOpen && task) {
      setLoading(true)
      setFetchError(null)
      fetchTask(task.id)
        .then((data) => {
          setCurrentTask(data)
          setSelectedTagIds(data.tags.map((t: Tag) => t.id))
          setLoading(false)
        })
        .catch((err) => {
          setFetchError(err.message || 'Failed to load task')
          setCurrentTask(task)
          setLoading(false)
        })
    }
  }, [isOpen, task, fetchTask])

  useEffect(() => {
    if (currentTask) {
      reset({
        title: currentTask.title,
        description: currentTask.description,
        context_id: currentTask.context_id ?? null,
        area_id: (currentTask as Record<string, unknown>).area_id as string | null ?? null,
        project_id: (currentTask as Record<string, unknown>).project_id as string | null ?? null,
        gtd_status: currentTask.gtd_status,
        due_date: currentTask.due_date ? currentTask.due_date.slice(0, 10) : null,
        notes: currentTask.notes ?? null,
      })
    }
  }, [currentTask, reset])

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const onSubmit = (data: EditTaskFormData) => {
    if (!currentTask) return
    onSave(currentTask.id, { ...data, tag_ids: selectedTagIds })
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 dark:bg-black/90"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-lg w-full mx-4 border-4 border-indigo-500 dark:border-indigo-400"
        onClick={(e) => e.stopPropagation()}
      >
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Edit Task</h2>

          {fetchError && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{fetchError}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ) : (

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                {...register('title')}
                type="text"
                id="title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                placeholder="Task title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                placeholder="Task description (optional)"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="context_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Контекст
              </label>
              <select
                {...register('context_id')}
                id="context_id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              >
                <option value="">Без контекста</option>
                {contexts.map((ctx) => (
                  <option key={ctx.id} value={ctx.id}>
                    {ctx.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="area_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Область
              </label>
              <select
                {...register('area_id')}
                id="area_id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              >
                <option value="">Без области</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Проект
              </label>
              <select
                {...register('project_id')}
                id="project_id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              >
                <option value="">Без проекта</option>
                {projects.filter((p) => p.is_active).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gtd_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                GTD-статус
              </label>
              <select
                {...register('gtd_status')}
                id="gtd_status"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              >
                {GTD_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дедлайн
              </label>
              <input
                {...register('due_date')}
                type="date"
                id="due_date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Заметки
              </label>
              <textarea
                {...register('notes')}
                id="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                placeholder="Заметки к задаче (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Теги
              </label>
              <TagChips
                tags={tags}
                selectedTagIds={selectedTagIds}
                onToggle={handleTagToggle}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              >
                Save
              </button>
            </div>
          </form>
          )}
        </div>
      </div>,
      document.body
    )
}
