import { useMemo } from 'react'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { TaskFilterPanel } from '../components/TaskFilterPanel'
import { TaskListView } from '../components/TaskListView'
import { useTaskFilter } from '../hooks/useTaskFilter'

interface GtdTaskListProps {
  gtdStatus: GtdStatus
  title: string
}

export function GtdTaskList({ gtdStatus, title }: GtdTaskListProps) {
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
    deleteTask,
    refetch,
  } = useTasks(activeFilters, {
    staleTime: gtdStatus === 'trash' ? 0 : undefined,
    refetchOnMount: gtdStatus === 'trash' ? 'always' : undefined,
  })

  const handleAddTask = async (data: { title: string; description?: string }) => {
    await addTask({ ...data, gtd_status: gtdStatus })
  }

  const handleDeleteTask = async (id: string) => {
    if (gtdStatus === 'trash') {
      if (!confirm('Удалить задачу навсегда?')) return
      await deleteTask(id)
    } else {
      await moveTask(id, 'trash')
    }
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
        onSaveTask={handleSaveTask}
        onRefetch={refetch}
        emptyMessage="Нет задач."
      />
    </div>
  )
}
