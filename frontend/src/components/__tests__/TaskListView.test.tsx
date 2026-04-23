import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TaskListView } from '../TaskListView'
import type { Task } from '../../hooks/useTasks'

describe('TaskListView', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    completed: false,
    gtd_status: 'inbox',
    context_id: null,
    area_id: null,
    project_id: null,
    project: null,
    context: null,
    parent_task_id: null,
    position: 0,
    due_date: null,
    notes: null,
    tags: [],
    subtasks_count: 0,
    subtasks_completed: 0,
    user_id: 'user1',
    created_at: '2026-04-13T10:00:00Z',
    updated_at: '2026-04-13T10:00:00Z',
  }

  const defaultProps = {
    tasks: [],
    isLoading: false,
    error: null,
    onAddTask: vi.fn(),
    onToggleTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onMoveTask: vi.fn(),
    onSaveTask: vi.fn(),
    onRefetch: vi.fn(),
  }

  it('displays task context badge', () => {
    const taskWithContext: Task = {
      ...mockTask,
      context: { id: 'ctx1', name: 'Дом', color: '#FF5733', icon: null },
    }

    const { container } = render(
      <MemoryRouter>
        <TaskListView
          {...defaultProps}
          tasks={[taskWithContext]}
          showAddForm={false}
        />
      </MemoryRouter>
    )

    const contextName = screen.getByText('Дом')
    expect(contextName).toBeInTheDocument()

    const contextContainer = container.querySelector('.text-\\[10px\\]')
    expect(contextContainer).toBeInTheDocument()
  })

  it('does not display context when task has no context', () => {
    render(
      <MemoryRouter>
        <TaskListView
          {...defaultProps}
          tasks={[mockTask]}
          showAddForm={false}
        />
      </MemoryRouter>
    )

    expect(screen.queryByText('Дом')).not.toBeInTheDocument()
  })

  it('displays context color dot when context has color', () => {
    const taskWithContext: Task = {
      ...mockTask,
      context: { id: 'ctx1', name: 'Работа', color: '#3B82F6', icon: null },
    }

    render(
      <MemoryRouter>
        <TaskListView
          {...defaultProps}
          tasks={[taskWithContext]}
          showAddForm={false}
        />
      </MemoryRouter>
    )

    const contextName = screen.getByText('Работа')
    expect(contextName).toBeInTheDocument()

    const contextContainer = contextName.parentElement
    expect(contextContainer).toBeInTheDocument()

    const colorDot = contextContainer?.querySelector('.rounded-full') as HTMLElement
    expect(colorDot).toBeInTheDocument()
    expect(colorDot.style.backgroundColor).toBe('rgb(59, 130, 246)')
  })

  it('does not display context color dot when context has no color', () => {
    const taskWithContext: Task = {
      ...mockTask,
      context: { id: 'ctx1', name: 'Без цвета', color: null, icon: null },
    }

    render(
      <MemoryRouter>
        <TaskListView
          {...defaultProps}
          tasks={[taskWithContext]}
          showAddForm={false}
        />
      </MemoryRouter>
    )

    const contextText = screen.getByText('Без цвета')
    expect(contextText).toBeInTheDocument()

    const contextContainer = contextText.parentElement
    expect(contextContainer).toBeInTheDocument()

    const colorDot = contextContainer?.querySelector('.rounded-full')
    expect(colorDot).toBeNull()
  })
})
