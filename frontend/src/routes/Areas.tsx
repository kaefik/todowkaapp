import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAreas, type Area } from '../hooks/useAreas'

const areaSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100, 'Максимум 100 символов'),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
})

type AreaFormData = z.infer<typeof areaSchema>

function AreaItem({
  area,
  onEdit,
  onDelete,
}: {
  area: Area
  onEdit: (area: Area) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {area.color && (
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: area.color }}
            />
          )}
          {!area.color && (
            <span className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
          )}
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {area.name}
            </span>
            {area.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {area.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(area)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          >
            Ред.
          </button>
          <button
            onClick={() => onDelete(area.id)}
            className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

function AreaForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: Area | null
  onSubmit: (data: AreaFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
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
              placeholder="Название области"
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

function AreasContent() {
  const { areas, isLoading, error, addArea, updateArea, deleteArea, refetch } = useAreas()
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (data: AreaFormData) => {
    setIsSubmitting(true)
    try {
      await addArea(data)
      setIsCreating(false)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: AreaFormData) => {
    if (!editingArea) return
    setIsSubmitting(true)
    try {
      await updateArea(editingArea.id, data)
      setEditingArea(null)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить область?')) return
    try {
      await deleteArea(id)
    } catch {
    }
  }

  if (isLoading && areas.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Области</h1>
        {!isCreating && !editingArea && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            + Новая область
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
        <AreaForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {editingArea && (
        <AreaForm
          initialData={editingArea}
          onSubmit={handleUpdate}
          onCancel={() => setEditingArea(null)}
          isSubmitting={isSubmitting}
        />
      )}

      {areas.length === 0 && !isLoading && !isCreating && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Нет областей.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Создайте первую область (например: &laquo;Работа&raquo;, &laquo;Личное&raquo;, &laquo;Здоровье&raquo;)
          </p>
        </div>
      )}

      <div className="space-y-2">
        {areas.map((area) => (
          <AreaItem
            key={area.id}
            area={area}
            onEdit={setEditingArea}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}

export function Areas() {
  return <AreasContent />
}
