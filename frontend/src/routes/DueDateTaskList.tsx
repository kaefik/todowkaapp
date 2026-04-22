import { useDueDateTasks } from '../hooks/useDueDateTasks'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { TaskListView } from '../components/TaskListView'

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

  const handleAddTask = async (data: { title: string; description?: string }) => {
    await addTask({ ...data })
  }

  const handleDeleteTask = async (id: string) => {
    await moveTask(id, 'trash')
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
        defaultGtdStatus="inbox"
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onSaveTask={handleSaveTask}
        onRefetch={refetch}
        emptyMessage={emptyMessage}
      />
    </div>
  )
}
