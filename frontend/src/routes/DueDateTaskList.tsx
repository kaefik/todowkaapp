import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDayBounds, useDueDateTasks } from '../hooks/useDueDateTasks'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { useAuthStore } from '../stores/authStore'
import { TaskListView } from '../components/TaskListView'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface DueDateTaskListProps {
  dayOffset: number
  title: string
  emptyMessage: string
}

export function DueDateTaskList({ dayOffset, title, emptyMessage }: DueDateTaskListProps) {
  const { t } = useTranslation('tasks')
  const user = useAuthStore(s => s.user)
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
