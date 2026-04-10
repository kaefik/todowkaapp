import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Task, UpdateTask } from '../hooks/useTasks'
import { useTasks } from '../hooks/useTasks'

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
})

type EditTaskFormData = z.infer<typeof editTaskSchema>

interface TaskEditModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: UpdateTask) => void
}

export function TaskEditModal({ task, isOpen, onClose, onSave }: TaskEditModalProps) {
  const { fetchTask } = useTasks()
  const [currentTask, setCurrentTask] = useState<Task | null>(task)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

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
      })
    }
  }, [currentTask, reset])

  const onSubmit = (data: EditTaskFormData) => {
    if (!currentTask) return
    onSave(currentTask.id, data)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-2xl max-w-lg w-full mx-4 border-4 border-indigo-500"
        onClick={(e) => e.stopPropagation()}
      >
          <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Task</h2>

          {fetchError && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{fetchError}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : (

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                {...register('title')}
                type="text"
                id="title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Task title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Task description (optional)"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
