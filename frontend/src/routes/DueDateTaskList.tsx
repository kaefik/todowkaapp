import { useState } from 'react'
import { useDueDateTasks } from '../hooks/useDueDateTasks'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { TaskListView } from '../components/TaskListView'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface DueDateTaskListProps {
  dayOffset: number
  title: string
  emptyMessage: string
}

export function DueDateTaskList({ dayOffset, title, emptyMessage }: DueDateTaskListProps) {
  const { tasks, isLoading } = useDueDateTasks(dayOffset)

  const {
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    refetch,
  } = useTasks()

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleAddTask = async (data: { title: string; description?: string }) => {
    const now = new Date()
    const target = new Date(now)
    target.setDate(target.getDate() + dayOffset)
    const dueDate = target.toISOString()
    await addTask({ ...data, due_date: dueDate, gtd_status: 'active' })
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

      <TaskListView
        tasks={tasks}
        isLoading={isLoading}
        error={null}
        onAddTask={handleAddTask}
        showAddForm={true}
        defaultGtdStatus="active"
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onSaveTask={handleSaveTask}
        onRefetch={refetch}
        emptyMessage={emptyMessage}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Переместить в корзину?"
        message="Задача будет перемещена в корзину."
        confirmText="Удалить"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
