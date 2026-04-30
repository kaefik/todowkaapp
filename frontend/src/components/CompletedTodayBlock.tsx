import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task, UpdateTask, GtdStatus } from '../hooks/useTasks'
import { TaskListView } from './TaskListView'

interface CompletedTodayBlockProps {
  tasks: Task[]
  isLoading: boolean
  onAddTask: (data: { title: string; description?: string }) => Promise<void>
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => Promise<void>
  onMoveTask: (id: string, status: GtdStatus) => Promise<void>
  onSaveTask: (id: string, data: UpdateTask) => Promise<void>
  onRefetch: () => void
}

export function CompletedTodayBlock({
  tasks,
  isLoading,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onMoveTask,
  onSaveTask,
  onRefetch,
}: CompletedTodayBlockProps) {
  const { t } = useTranslation('tasks')
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isLoading && tasks.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors focus:outline-none"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          {t('completedTodayCount', { count: tasks.length })}
        </span>
        <svg
          className={`h-4 w-4 text-green-500 dark:text-green-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
            emptyMessage={t('noCompletedToday')}
          />
        </div>
      )}
    </div>
  )
}