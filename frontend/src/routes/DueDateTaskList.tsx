import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDayBounds, useDueDateTasks } from '../hooks/useDueDateTasks'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { useAuthStore } from '../stores/authStore'
import { TaskFilterPanel } from '../components/TaskFilterPanel'
import { TaskListView } from '../components/TaskListView'
import { OverdueTasksBlock } from '../components/OverdueTasksBlock'
import { useOverdueTasks } from '../hooks/useOverdueTasks'
import { useTaskFilter } from '../hooks/useTaskFilter'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface DueDateTaskListProps {
  dayOffset: number
  title: string
  emptyMessage: string
}

export function DueDateTaskList({ dayOffset, title, emptyMessage }: DueDateTaskListProps) {
  const { t } = useTranslation('tasks')
  const user = useAuthStore(s => s.user)
  const { tasks: dueTasks, isLoading } = useDueDateTasks(dayOffset)
  const { tasks: overdueTasks, isLoading: overdueLoading } = useOverdueTasks()

  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useTaskFilter()

  const {
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    refetch,
  } = useTasks()

  const tasks = useMemo(() => {
    let result = dueTasks
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q))
    }
    if (filters.sort_by) {
      const dir = filters.sort_order === 'desc' ? -1 : 1
      result = [...result].sort((a, b) => {
        const aVal = a[filters.sort_by as keyof typeof a]
        const bVal = b[filters.sort_by as keyof typeof b]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (aVal < bVal) return -1 * dir
        if (aVal > bVal) return 1 * dir
        return 0
      })
    }
    return result
  }, [dueTasks, filters.search, filters.sort_by, filters.sort_order])

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleAddTask = async (data: { title: string; description?: string }) => {
    const { end } = getDayBounds(user?.timezone ?? null, dayOffset)
    await addTask({ ...data, due_date: end, gtd_status: 'active' })
  }

  const handleDeleteTask = async (id: string) => {
    setPendingDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await moveTask(pendingDeleteId, 'trash')
    setPendingDeleteId(null)
    refetch()
  }

  const pendingDeleteTask = tasks.find(t => t.id === pendingDeleteId)
  const checklistWarning = pendingDeleteTask && pendingDeleteTask.checklist_total > 0
    ? ' ' + t('checklistWarning', { count: pendingDeleteTask.checklist_total })
    : ''

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
        filters={filters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        hideGtdStatus
        hideProject
        hideArea
      />

      <TaskListView
        tasks={tasks}
        isLoading={isLoading}
        error={null}
        searchQuery={filters.search}
        onAddTask={handleAddTask}
        showAddForm={true}
        defaultGtdStatus="active"
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onSaveTask={handleSaveTask}
        onRefetch={refetch}
        emptyMessage={emptyMessage}
        groupBy={filters.group_by}
        afterAddForm={dayOffset === 0 ? (
          <OverdueTasksBlock
            tasks={overdueTasks}
            isLoading={overdueLoading}
            onAddTask={handleAddTask}
            onToggleTask={toggleTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
            onSaveTask={handleSaveTask}
            onRefetch={refetch}
          />
        ) : undefined}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={t('confirmTrash')}
        message={`${t('confirmTrashBody')}.${checklistWarning}`}
        confirmText={t('delete', { ns: 'common' })}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
