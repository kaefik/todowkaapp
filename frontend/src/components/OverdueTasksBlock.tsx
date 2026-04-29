import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task, UpdateTask, GtdStatus } from '../hooks/useTasks'
import { TaskListView } from './TaskListView'

interface OverdueTasksBlockProps {
  tasks: Task[]
  isLoading: boolean
  onAddTask: (data: { title: string; description?: string }) => Promise<void>
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => Promise<void>
  onMoveTask: (id: string, status: GtdStatus) => Promise<void>
  onSaveTask: (id: string, data: UpdateTask) => Promise<void>
  onRefetch: () => void
}

export function OverdueTasksBlock({
  tasks,
  isLoading,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onMoveTask,
  onSaveTask,
  onRefetch,
}: OverdueTasksBlockProps) {
  const { t } = useTranslation('tasks')
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isLoading && tasks.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus:outline-none"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {t('overdueCount', { count: tasks.length })}
        </span>
        <svg
          className={`h-4 w-4 text-red-500 dark:text-red-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2">
          <TaskListView
            tasks={tasks}
            isLoading={isLoading}
            error={null}
            onAddTask={onAddTask}
            showAddForm={false}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onMoveTask={onMoveTask}
            onSaveTask={onSaveTask}
            onRefetch={onRefetch}
            emptyMessage={t('noOverdueTasks')}
          />
        </div>
      )}
    </div>
  )
}
