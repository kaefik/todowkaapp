import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { TaskFilterPanel } from '../components/TaskFilterPanel'
import { TaskListView } from '../components/TaskListView'
import { useTaskFilter } from '../hooks/useTaskFilter'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface GtdTaskListProps {
  gtdStatus: GtdStatus
  title: string
}

export function GtdTaskList({ gtdStatus, title }: GtdTaskListProps) {
  const { t } = useTranslation('tasks')
  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useTaskFilter({ gtd_status: gtdStatus })

  const activeFilters = useMemo(() => ({ ...filters, gtd_status: gtdStatus }), [filters, gtdStatus])

  const {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    restoreTask,
    deleteTask,
    refetch,
  } = useTasks(activeFilters)

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)

  const handleAddTask = async (data: { title: string; description?: string }) => {
    await addTask({ ...data, gtd_status: gtdStatus })
  }

  const handleDeleteTask = async (id: string) => {
    setPendingDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    if (gtdStatus === 'trash') {
      await deleteTask(pendingDeleteId)
    } else {
      await moveTask(pendingDeleteId, 'trash')
    }
    setPendingDeleteId(null)
    refetch()
  }

  const pendingDeleteTask = tasks.find(t => t.id === pendingDeleteId)
  const checklistWarning = pendingDeleteTask && pendingDeleteTask.checklist_total > 0
    ? ` ${t('checklistCount_one', { count: pendingDeleteTask.checklist_total })}.${gtdStatus === 'trash' ? ' ' + t('checklistWillBeDeleted') : ' ' + t('checklistWillBeTrashed')}`
    : ''

  const deleteTitle = gtdStatus === 'trash' ? t('confirmDelete') : t('confirmTrash')
  const deleteMessage = (gtdStatus === 'trash' ? t('thisActionCannotBeUndone') : t('confirmTrashBody')) + checklistWarning

  const handleRestoreTask = async (id: string) => {
    setPendingRestoreId(id)
  }

  const confirmRestore = async () => {
    if (!pendingRestoreId) return
    await restoreTask(pendingRestoreId)
    setPendingRestoreId(null)
    refetch()
  }

  const handleSaveTask = async (id: string, data: UpdateTask) => {
    await updateTask(id, data)
  }

  const handleMoveTask = async (id: string, status: GtdStatus) => {
    await moveTask(id, status)
    refetch()
  }

  return (
    <div className="space-y-6">
      {title && <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>}

      <TaskFilterPanel
        filters={activeFilters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        hideGtdStatus
      />

      <TaskListView
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        searchQuery={filters.search}
        onAddTask={handleAddTask}
        showAddForm={gtdStatus !== 'completed' && gtdStatus !== 'trash'}
        defaultGtdStatus={gtdStatus}
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onRestoreTask={gtdStatus === 'trash' ? handleRestoreTask : undefined}
        onSaveTask={handleSaveTask}
        onRefetch={refetch}
        emptyMessage={t('noTasks')}
        autoFocus={gtdStatus === 'inbox'}
        groupBy={filters.group_by}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={deleteTitle}
        message={deleteMessage}
        confirmText={gtdStatus === 'trash' ? t('deletePermanently') : t('deleteBtn')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ConfirmDialog
        open={!!pendingRestoreId}
        title={t('confirmRestore')}
        message={t('confirmRestoreBody')}
        confirmText={t('restore')}
        variant="normal"
        onConfirm={confirmRestore}
        onCancel={() => setPendingRestoreId(null)}
      />
    </div>
  )
}
