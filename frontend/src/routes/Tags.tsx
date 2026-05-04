import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useTags, type Tag } from '../hooks/useTags'
import { ColorPickerField } from '../components/ColorPickerField'
import { TatarKeyboardBar } from '../components/TatarKeyboardBar'
import { ConfirmDialog } from '../components/ConfirmDialog'

const colorHexRegex = /^#[0-9A-Fa-f]{6}$/

function useTagSchema() {
  const { t } = useTranslation('projects')
  return z.object({
    name: z.string().min(1, t('nameRequired')).max(50, t('nameMax50')),
    color: z.string().nullable().optional().refine(
      (val) => val === null || val === undefined || val === '' || colorHexRegex.test(val),
      { message: t('colorFormat') }
    ),
  })
}

type TagFormData = z.infer<ReturnType<typeof useTagSchema>>

function TagItem({
  tag,
  onEdit,
  onDelete,
}: {
  tag: Tag
  onEdit: (tag: Tag) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('projects')
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
            {t('edit', { ns: 'common' })}
          </button>
          <button
            onClick={() => onDelete(tag.id)}
            className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
          >
            {t('delete', { ns: 'common' })}
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
  const { t } = useTranslation('projects')
  const tagSchema = useTagSchema()
  const {
    register,
    handleSubmit,
    control,
    setValue: setFormValue,
    getValues,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: initialData?.name || '',
      color: initialData?.color || null,
    },
  })

  const nameInputRef = useRef<HTMLInputElement>(null)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            {...register('name')}
            type="text"
            placeholder={t('tagName')}
            ref={nameInputRef}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm"
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
          <TatarKeyboardBar
            inputRef={nameInputRef}
            value={getValues('name') || ''}
            onChange={(v) => setFormValue('name', v, { shouldValidate: true })}
          />
        </div>
        <div className="w-28">
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <ColorPickerField value={field.value ?? null} onChange={field.onChange} />
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
          {t('cancel', { ns: 'common' })}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('saving', { ns: 'common' }) : initialData ? t('save', { ns: 'common' }) : t('create', { ns: 'common' })}
        </button>
      </div>
    </form>
  )
}

function TagsContent() {
  const { t } = useTranslation('projects')
  const { tags, isLoading, error, addTag, updateTag, deleteTag, refetch } = useTags()
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
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
    setPendingDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    try {
      await deleteTag(pendingDeleteId)
    } catch {
    } finally {
      setPendingDeleteId(null)
    }
  }

  const pendingDeleteTag = tags.find(t => t.id === pendingDeleteId)

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('tags')}</h1>
        {!isCreating && !editingTag && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            {t('newTag')}
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
              {t('retry', { ns: 'common' })}
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
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('noTags')}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {t('createFirstTag')}
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

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t('confirmDeleteTag').split('?')[0] + '?'}
        message={pendingDeleteTag ? ` "${pendingDeleteTag.name}"?` : t('confirmDeleteTag')}
        confirmText={t('delete', { ns: 'common' })}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}

export function Tags() {
  return <TagsContent />
}
