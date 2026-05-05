import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useProjects, reorderProjects, autoSortProjects, useNoProjectCount, type Project, type SortMode } from '../hooks/useProjects'
import { ColorPickerField } from '../components/ColorPickerField'
import { TatarKeyboardBar } from '../components/TatarKeyboardBar'
import { ConfirmDialog } from '../components/ConfirmDialog'

const colorHexRegex = /^#[0-9A-Fa-f]{6}$/

const baseProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional().refine(
    (val) => val === null || val === undefined || val === '' || colorHexRegex.test(val),
    { message: 'colorFormat' }
  ),
})

type ProjectFormData = z.infer<typeof baseProjectSchema>

function getStoredSortMode(): SortMode | null {
  try {
    return localStorage.getItem('projects_sort_mode') as SortMode | null
  } catch { return null }
}

function storeSortMode(mode: SortMode | null) {
  try {
    if (mode) localStorage.setItem('projects_sort_mode', mode)
    else localStorage.removeItem('projects_sort_mode')
  } catch {}
}

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
  const { t } = useTranslation('projects')
  const tc = useTranslation('common').t
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
            <span className="text-xs text-gray-400 dark:text-gray-500">({t('archive')})</span>
          )}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(project)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          >
            {tc('edit')}
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
          >
            {tc('delete')}
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
          <span>{t('tasksCount', { completed: project.progress.tasks_completed, total: project.progress.tasks_total })}</span>
          <span>{project.progress.progress_percent}%</span>
        </div>
      </div>
    </div>
  )
}

function SortableProjectCard({
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
  const { t } = useTranslation('projects')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
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
        <ProjectCard project={project} onEdit={onEdit} onDelete={onDelete} onClick={onClick} />
      </div>
    </div>
  )
}

function NoProjectCard({ count, onClick }: { count: number; onClick: () => void }) {
  const { t } = useTranslation('projects')
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600 border-2 border-dashed border-gray-400 dark:border-gray-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {t('noProject')}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">({count})</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('noProjectDescription')}</p>
    </div>
  )
}

function SortPanel({ activeMode, onSort }: { activeMode: SortMode | null; onSort: (mode: SortMode) => void }) {
  const { t } = useTranslation('projects')
  const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
    { mode: 'name', label: t('sortByName') },
    { mode: 'date', label: t('sortByDate') },
    { mode: 'tasks', label: t('sortByTasks') },
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
  const { t } = useTranslation('projects')
  const tc = useTranslation('common').t
  const schema = baseProjectSchema.extend({
    name: z.string().min(1, t('nameRequired')).max(200, t('nameMax200')),
    color: z.string().nullable().optional().refine(
      (val) => val === null || val === undefined || val === '' || colorHexRegex.test(val),
      { message: t('colorFormat') }
    ),
  })
  const {
    register,
    handleSubmit,
    control,
    setValue: setFormValue,
    getValues,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(schema),
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
              placeholder={t('projectName')}
              defaultValue={initialData?.name || ''}
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
            defaultValue={initialData?.description || ''}
            placeholder={t('projectDescription')}
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
          {tc('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? tc('saving') : initialData ? tc('save') : tc('create')}
        </button>
      </div>
    </form>
  )
}

function ProjectsContent() {
  const { t } = useTranslation('projects')
  const tc = useTranslation('common').t
  const navigate = useNavigate()
  const { projects, isLoading, error, addProject, updateProject, deleteProject, refetch } = useProjects()
  const noProjectCount = useNoProjectCount()
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode | null>(getStoredSortMode)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...projects]
    const [moved] = reordered.splice(oldIndex, 1)
    if (!moved) return
    reordered.splice(newIndex, 0, moved)

    const items = reordered.map((p, i) => ({ id: p.id, sort_order: i }))
    await reorderProjects(items)
    setSortMode(null)
    storeSortMode(null)
  }

  const handleAutoSort = async (mode: SortMode) => {
    const items = autoSortProjects(projects, mode)
    await reorderProjects(items)
    setSortMode(mode)
    storeSortMode(mode)
  }

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
    setPendingDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    try {
      await deleteProject(pendingDeleteId)
    } catch {
    } finally {
      setPendingDeleteId(null)
    }
  }

  const pendingDeleteProject = projects.find(p => p.id === pendingDeleteId)

  const handleClickProject = (id: string) => {
    navigate(`/projects/${id}`)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('projects')}</h1>
        {!isCreating && !editingProject && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            {t('newProject')}
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
              {tc('retry')}
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
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('noProjects')}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {t('createFirstProject')}
          </p>
        </div>
      )}

      {projects.length > 1 && (
        <SortPanel activeMode={sortMode} onSort={handleAutoSort} />
      )}

      {noProjectCount > 0 && (
        <NoProjectCard count={noProjectCount} onClick={() => handleClickProject('no-project')} />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {projects.map((project) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                onEdit={setEditingProject}
                onDelete={handleDelete}
                onClick={handleClickProject}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t('confirmDeleteProject').split('?')[0] + '?'}
        message={pendingDeleteProject ? ` "${pendingDeleteProject.name}" — ${t('confirmDeleteProject').split('?')[1] || 'Задачи проекта будут отвязаны.'}` : t('confirmDeleteProject')}
        confirmText={t('delete', { ns: 'common' })}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}

export function Projects() {
  return <ProjectsContent />
}
