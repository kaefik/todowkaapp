import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TaskEditModal } from './TaskEditModal'
import type { Task } from '../hooks/useTasks'

vi.mock('../hooks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('../hooks/useContexts', () => ({
  useContexts: vi.fn(),
}))

vi.mock('../hooks/useAreas', () => ({
  useAreas: vi.fn(),
}))

vi.mock('../hooks/useTags', () => ({
  useTags: vi.fn(),
}))

vi.mock('../hooks/useProjects', () => ({
  useProjects: vi.fn(),
}))

vi.mock('../db/hooks', () => ({
  useOnlineStatus: vi.fn().mockReturnValue(true),
  useDexieQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}))

import { useTasks } from '../hooks/useTasks'
import { useContexts } from '../hooks/useContexts'
import { useAreas } from '../hooks/useAreas'
import { useTags } from '../hooks/useTags'
import { useProjects } from '../hooks/useProjects'

describe('TaskEditModal — toLocalDateStr / todayLocalDateStr helpers', () => {
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  const baseTask: Task = {
    id: '1',
    title: 'Test',
    description: null,
    completed: false,
    gtd_status: 'inbox',
    context_id: null,
    area_id: null,
    project_id: null,
    parent_task_id: null,
    position: 0,
    due_date: null,
    notes: null,
    recurrence_type: null,
    recurrence_config: null,
    recurrence_end_date: null,
    reminder_time: null,
    reminder_offsets: null,
    reminder_fired: false,
    is_recurring: false,
    project: null,
    context: null,
    tags: [],
    subtasks_count: 0,
    subtasks_completed: 0,
    user_id: 'user1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTasks).mockReturnValue({
      tasks: [],
      isLoading: false,
      error: null,
      addTask: vi.fn(),
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      moveTask: vi.fn(),
      deleteTask: vi.fn(),
      refetch: vi.fn(),
      fetchTask: vi.fn(),
    })
    vi.mocked(useContexts).mockReturnValue({
      contexts: [],
      isLoading: false,
      error: null,
      addContext: vi.fn(),
      updateContext: vi.fn(),
      deleteContext: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useAreas).mockReturnValue({
      areas: [],
      isLoading: false,
      error: null,
      addArea: vi.fn(),
      updateArea: vi.fn(),
      deleteArea: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      tags: [],
      isLoading: false,
      error: null,
      addTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useProjects).mockReturnValue({
      projects: [],
      isLoading: false,
      error: null,
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refetch: vi.fn(),
    })
  })

  const renderModal = (task: Task) => {
    return render(
      <TaskEditModal
        task={task}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )
  }

  describe('toLocalDateStr — extracts local date from ISO string', () => {
    it('extracts local date from a UTC timestamp using local timezone', async () => {
      const task: Task = {
        ...baseTask,
        due_date: '2026-04-25T23:59:59.999Z',
      }
      renderModal(task)

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const dateInput = screen.getByLabelText('Дедлайн') as HTMLInputElement
      const d = new Date('2026-04-25T23:59:59.999Z')
      const expectedLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(dateInput.value).toBe(expectedLocal)
    })

    it('handles ISO date that crosses midnight in local time', async () => {
      const task: Task = {
        ...baseTask,
        due_date: '2026-04-26T00:30:00.000Z',
      }
      renderModal(task)

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const dateInput = screen.getByLabelText('Дедлайн') as HTMLInputElement
      const d = new Date('2026-04-26T00:30:00.000Z')
      const expectedLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(dateInput.value).toBe(expectedLocal)
    })

    it('returns empty for null due_date', async () => {
      const task: Task = {
        ...baseTask,
        due_date: null,
      }
      renderModal(task)

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const dateInput = screen.getByLabelText('Дедлайн') as HTMLInputElement
      expect(dateInput.value).toBe('')
    })

    it('handles date-only ISO string', async () => {
      const task: Task = {
        ...baseTask,
        due_date: '2026-01-15',
      }
      renderModal(task)

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const dateInput = screen.getByLabelText('Дедлайн') as HTMLInputElement
      const d = new Date('2026-01-15')
      const expectedLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(dateInput.value).toBe(expectedLocal)
    })
  })

  describe('todayLocalDateStr — "Сегодня" checkbox', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('marks task due today as "Сегодня" checked', async () => {
      const now = new Date()
      const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const endOfDay = `${localDateStr}T23:59:59.999`

      const task: Task = {
        ...baseTask,
        due_date: endOfDay,
      }
      renderModal(task)

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const todayCheckbox = screen.getByRole('checkbox', { name: 'Сегодня' })
      expect(todayCheckbox).toBeChecked()
    })

    it('does not check "Сегодня" for a task due tomorrow', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
      const endOfDay = `${tomorrowStr}T23:59:59.999`

      const task: Task = {
        ...baseTask,
        due_date: endOfDay,
      }
      renderModal(task)

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const todayCheckbox = screen.getByRole('checkbox', { name: 'Сегодня' })
      expect(todayCheckbox).not.toBeChecked()
    })

    it('uses local date for "Сегодня" comparison with fake timers', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-25T22:00:00'))

      const localDateStr = '2026-04-25'
      const task: Task = {
        ...baseTask,
        due_date: `${localDateStr}T23:59:59.999`,
      }
      renderModal(task)

      expect(screen.getByText('Edit Task')).toBeInTheDocument()

      const todayCheckbox = screen.getByRole('checkbox', { name: 'Сегодня' })
      expect(todayCheckbox).toBeChecked()

      const dateInput = screen.getByLabelText('Дедлайн') as HTMLInputElement
      expect(dateInput.value).toBe('2026-04-25')
    })
  })
})
