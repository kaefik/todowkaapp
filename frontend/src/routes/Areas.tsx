import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAreas, reorderAreas, autoSortAreas, type Area, type AreaSortMode } from '../hooks/useAreas'
import { ColorPickerField } from '../components/ColorPickerField'
import { TatarKeyboardBar } from '../components/TatarKeyboardBar'
import { ConfirmDialog } from '../components/ConfirmDialog'

const colorHexRegex = /^#[0-9A-Fa-f]{6}$/

function useAreaSchema() {
  const { t } = useTranslation('projects')
  return z.object({
    name: z.string().min(1, t('nameRequired')).max(100, t('nameMax100')),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional().refine(
      (val) => val === null || val === undefined || val === '' || colorHexRegex.test(val),
      { message: t('colorFormat') }
    ),
  })
}

type AreaFormData = z.infer<ReturnType<typeof useAreaSchema>>

function getStoredSortMode(): AreaSortMode | null {
  try {
    return localStorage.getItem('areas_sort_mode') as AreaSortMode | null
  } catch { return null }
}

function storeSortMode(mode: AreaSortMode | null) {
  try {
    if (mode) localStorage.setItem('areas_sort_mode', mode)
    else localStorage.removeItem('areas_sort_mode')
  } catch {}
}

function SortableAreaItem({
  area,
  onEdit,
  onDelete,
}: {
  area: Area
  onEdit: (area: Area) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('projects')
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: area.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 flex-shrink-0 focus:outline-none"
        aria-label={t('dragToSort')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <AreaItem area={area} onEdit={onEdit} onDelete={onDelete} navigate={navigate} />
      </div>
    </div>
  )
}

function AreaItem({
  area,
  onEdit,
  onDelete,
  navigate,
}: {
  area: Area
  onEdit: (area: Area) => void
  onDelete: (id: string) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const { t } = useTranslation('projects')
  return (
    <div
      onClick={() => navigate(`/areas/${area.id}`)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
    >
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
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(area)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          >
            {t('edit', { ns: 'common' })}
          </button>
          <button
            onClick={() => onDelete(area.id)}
            className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
          >
            {t('delete', { ns: 'common' })}
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
  const { t } = useTranslation('projects')
  const areaSchema = useAreaSchema()
  const {
    register,
    handleSubmit,
    control,
    setValue: setFormValue,
    getValues,
    formState: { errors },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || null,
      color: initialData?.color || null,
    },
  })

  const nameInputRef = useRef<HTMLInputElement>(null)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              {...register('name')}
              type="text"
              placeholder={t('areaName')}
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
        <div>
          <input
            {...register('description')}
            type="text"
            placeholder={t('areaDescription')}
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

function AreaSortPanel({ activeMode, onSort }: { activeMode: AreaSortMode | null; onSort: (mode: AreaSortMode) => void }) {
  const { t } = useTranslation('projects')
  const SORT_OPTIONS: { mode: AreaSortMode; label: string }[] = [
    { mode: 'name', label: t('sortByName') },
    { mode: 'date', label: t('sortByDate') },
  ]

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{t('sorting')}</span>
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.mode}
          onClick={() => onSort(opt.mode)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            activeMode === opt.mode
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function AreasContent() {
  const { t } = useTranslation('projects')
  const { areas, isLoading, error, addArea, updateArea, deleteArea, refetch } = useAreas()
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sortMode, setSortMode] = useState<AreaSortMode | null>(getStoredSortMode)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = areas.findIndex(a => a.id === active.id)
    const newIndex = areas.findIndex(a => a.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...areas]
    const [moved] = reordered.splice(oldIndex, 1)
    if (!moved) return
    reordered.splice(newIndex, 0, moved)

    const items = reordered.map((a, i) => ({ id: a.id, sort_order: i }))
    await reorderAreas(items)
    setSortMode(null)
    storeSortMode(null)
  }

  const handleAutoSort = async (mode: AreaSortMode) => {
    const items = autoSortAreas(areas, mode)
    await reorderAreas(items)
    setSortMode(mode)
    storeSortMode(mode)
  }

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
    setPendingDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    try {
      await deleteArea(pendingDeleteId)
    } catch {
    } finally {
      setPendingDeleteId(null)
    }
  }

  const pendingDeleteArea = areas.find(a => a.id === pendingDeleteId)

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('areas')}</h1>
        {!isCreating && !editingArea && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            {t('newArea')}
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
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('noAreas')}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {t('createFirstArea')}
          </p>
        </div>
      )}

      {areas.length > 1 && (
        <AreaSortPanel activeMode={sortMode} onSort={handleAutoSort} />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={areas.map(a => a.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {areas.map((area) => (
              <SortableAreaItem
                key={area.id}
                area={area}
                onEdit={setEditingArea}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t('confirmDeleteArea').split('?')[0] + '?'}
        message={pendingDeleteArea ? ` "${pendingDeleteArea.name}"?` : t('confirmDeleteArea')}
        confirmText={t('delete', { ns: 'common' })}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}

export function Areas() {
  return <AreasContent />
}
