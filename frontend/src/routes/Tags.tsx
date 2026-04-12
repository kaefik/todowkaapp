import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTags, type Tag } from '../hooks/useTags'
import { ColorPickerField } from '../components/ColorPickerField'

const colorHexRegex = /^#[0-9A-Fa-f]{6}$/

const tagSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(50, 'Максимум 50 символов'),
  color: z.string().nullable().optional().refine(
    (val) => val === null || val === undefined || val === '' || colorHexRegex.test(val),
    { message: 'Формат: #RRGGBB' }
  ),
})

type TagFormData = z.infer<typeof tagSchema>

function TagItem({
  tag,
  onEdit,
  onDelete,
}: {
  tag: Tag
  onEdit: (tag: Tag) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tag.color ? (
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: tag.color }}
            />
          ) : (
            <span className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {tag.name}
          </span>
          {tag.color && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(tag)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          >
            Ред.
          </button>
          <button
            onClick={() => onDelete(tag.id)}
            className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

function TagForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: Tag | null
  onSubmit: (data: TagFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: initialData?.name || '',
      color: initialData?.color || null,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            {...register('name')}
            type="text"
            placeholder="Название тега"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm"
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>
        <div className="w-28">
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <ColorPickerField value={field.value} onChange={field.onChange} />
            )}
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

function TagsContent() {
  const { tags, isLoading, error, addTag, updateTag, deleteTag, refetch } = useTags()
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (data: TagFormData) => {
    setIsSubmitting(true)
    try {
      await addTag(data)
      setIsCreating(false)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: TagFormData) => {
    if (!editingTag) return
    setIsSubmitting(true)
    try {
      await updateTag(editingTag.id, data)
      setEditingTag(null)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить тег?')) return
    try {
      await deleteTag(id)
    } catch {
    }
  }

  if (isLoading && tags.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Теги</h1>
        {!isCreating && !editingTag && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            + Новый тег
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
        <TagForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {editingTag && (
        <TagForm
          initialData={editingTag}
          onSubmit={handleUpdate}
          onCancel={() => setEditingTag(null)}
          isSubmitting={isSubmitting}
        />
      )}

      {tags.length === 0 && !isLoading && !isCreating && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Нет тегов.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Создайте первый тег (например: &laquo;срочно&raquo;, &laquo;важно&raquo;, &laquo;дом&raquo;)
          </p>
        </div>
      )}

      <div className="space-y-2">
        {tags.map((tag) => (
          <TagItem
            key={tag.id}
            tag={tag}
            onEdit={setEditingTag}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}

export function Tags() {
  return <TagsContent />
}
