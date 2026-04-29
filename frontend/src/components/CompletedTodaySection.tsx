import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '../hooks/useTasks'

interface CompletedTodaySectionProps {
  tasks: Task[]
  isLoading: boolean
  onToggleTask: (id: string) => void
}

export function CompletedTodaySection({
  tasks,
  isLoading,
  onToggleTask,
}: CompletedTodaySectionProps) {
  const { t } = useTranslation('tasks')
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isLoading && tasks.length === 0) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors focus:outline-none"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
          {t('completedTodayCount', { count: tasks.length })}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 opacity-75"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-400 dark:decoration-gray-500">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white opacity-60"
                          style={{ backgroundColor: tag.color || '#6366f1' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {task.project && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                        {task.project.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                        )}
                        <span className="opacity-60">{task.project.name}</span>
                      </span>
                    </div>
                  )}
                  {task.context && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                        {task.context.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.context.color }} />
                        )}
                        <span className="opacity-60">{task.context.name}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
