import { useCallback } from 'react'
import { useHaptic, isTelegramWebApp } from '../../tg'

export interface Task {
  id: number
  title: string
  description?: string
  due_date?: string | null
  is_completed: boolean
  gtd_status: string
}

interface TgTaskCardProps {
  task: Task
  onToggle: (id: number) => void
  onClick: (id: number) => void
}

export function TgTaskCard({ task, onToggle, onClick }: TgTaskCardProps) {
  const { impact } = useHaptic()

  const handleToggle = useCallback(() => {
    if (isTelegramWebApp()) {
      impact('medium')
    }
    onToggle(task.id)
  }, [task.id, onToggle, impact])

  const handleClick = useCallback(() => {
    onClick(task.id)
  }, [task.id, onClick])

  const formatDueDate = (date?: string | null) => {
    if (!date) return null
    const d = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d >= today && d < tomorrow) return 'Сегодня'
    if (d >= tomorrow && d < new Date(tomorrow.getTime() + 24*60*60*1000)) return 'Завтра'
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed

  return (
    <div 
      onClick={handleClick}
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={handleToggle}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '20px', height: '20px', accentColor: '#5c6bc0' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '15px',
            color: task.is_completed ? '#999999' : '#000000',
            textDecoration: task.is_completed ? 'line-through' : 'none'
          }}>
            {task.title}
          </div>
          {task.due_date && (
            <div style={{
              fontSize: '12px',
              color: isOverdue ? '#f44336' : '#666666'
            }}>
              📅 {formatDueDate(task.due_date)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}