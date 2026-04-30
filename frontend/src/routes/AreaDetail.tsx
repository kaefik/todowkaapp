import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAreas } from '../hooks/useAreas'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { useTaskFilter } from '../hooks/useTaskFilter'
import { TaskFilterPanel } from '../components/TaskFilterPanel'
import { TaskListView } from '../components/TaskListView'
import { notifyTasksChanged } from '../hooks/useGtdCounts'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function AreaDetail() {
  const { t } = useTranslation('projects')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { areas, isLoading: isLoadingAreas } = useAreas()

  const area = useMemo(
    () => areas.find(a => a.id === id) ?? null,
    [areas, id]
  )

  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useTaskFilter({ area_id: id })

  const activeFilters = useMemo(
    () => ({ ...filters, area_id: id }),
    [filters, id]
  )

  const {
    tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    refetch,
  } = useTasks(activeFilters)

  const visibleTasks = useMemo(
    () => tasks.filter(t => t.gtd_status !== 'trash'),
    [tasks]
  )

  const handleAddTask = async (data: { title: string; description?: string }) => {
    await addTask({ ...data, area_id: id, gtd_status: 'active' })
  }

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleDeleteTask = async (taskId: string) => {
    setPendingDeleteId(taskId)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await moveTask(pendingDeleteId, 'trash')
    setPendingDeleteId(null)
    refetch()
    notifyTasksChanged()
  }

  const pendingDeleteTask = tasks.find(t => t.id === pendingDeleteId)

  const handleSaveTask = async (taskId: string, data: UpdateTask) => {
    await updateTask(taskId, data)
  }

  const handleMoveTask = async (taskId: string, status: GtdStatus) => {
    await moveTask(taskId, status)
    refetch()
    notifyTasksChanged()
  }

  const handleToggleTask = async (taskId: string) => {
    await toggleTask(taskId)
  }

  if (isLoadingAreas) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!area) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/areas')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          &larr; {t('backToAreas').replace('← ', '')}
        </button>
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{t('areaNotFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/areas')}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        &larr; {t('backToAreas').replace('← ', '')}
      </button>

      <div className="sticky top-16 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {area.color ? (
            <span
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ backgroundColor: area.color }}
            />
          ) : (
            <span className="w-5 h-5 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{area.name}</h1>
        </div>
        {area.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{area.description}</p>
        )}
      </div>

      <TaskFilterPanel
        filters={activeFilters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        hideArea
      />

      <TaskListView
        tasks={visibleTasks}
        isLoading={isLoadingTasks}
        error={tasksError}
        searchQuery={filters.search}
        onAddTask={handleAddTask}
        showAddForm={true}
        defaultAreaId={id}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onSaveTask={handleSaveTask}
        onRefetch={() => refetch()}
        emptyMessage={t('noAreaTasks')}
        showGtdStatus
        groupBy={filters.group_by}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t('confirmTrash')}
        message={(pendingDeleteTask ? ` "${pendingDeleteTask.title}" — ` : '') + t('confirmTrashBody')}
        confirmText={t('deleteBtn')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
