import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { GtdTaskList } from './routes/GtdTaskList'
import type { Task } from './hooks/useTasks'

vi.mock('./hooks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('./hooks/useSubtasks', () => ({
  useSubtasks: vi.fn(),
}))

vi.mock('./hooks/useTaskFilter', () => ({
  useTaskFilter: vi.fn(),
}))

vi.mock('./hooks/useDebounce', () => ({
  useDebounce: (v: string) => v,
}))

vi.mock('./components/TaskEditModal', () => ({
  TaskEditModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="edit-modal">Edit Modal</div> : null,
}))

vi.mock('./components/TaskFilterPanel', () => ({
  TaskFilterPanel: () => <div data-testid="filter-panel">Filter Panel</div>,
  HighlightText: ({ text }: { text: string }) => <>{text}</>,
}))

import { useTasks } from './hooks/useTasks'
import { useSubtasks } from './hooks/useSubtasks'
import { useTaskFilter } from './hooks/useTaskFilter'

const mockTask: Task = {
  id: 't1',
  title: 'Test Task',
  description: 'Test desc',
  completed: false,
  gtd_status: 'inbox',
  context_id: null,
  area_id: null,
  project_id: null,
  parent_task_id: null,
  position: 0,
  due_date: null,
  notes: null,
  tags: [],
  subtasks_count: 2,
  subtasks_completed: 1,
  user_id: 'u1',
  created_at: '2026-04-12T00:00:00',
  updated_at: '2026-04-12T00:00:00',
}

describe('GtdTaskList — subtasks', () => {
  const mockToggleTask = vi.fn()
  const mockMoveTask = vi.fn()
  const mockDeleteTask = vi.fn()
  const mockAddTask = vi.fn()
  const mockUpdateTask = vi.fn()
  const mockRefetch = vi.fn()
  const mockAddSubtask = vi.fn()
  const mockToggleSubtask = vi.fn()
  const mockDeleteSubtask = vi.fn()
  const mockSubtaskRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTasks).mockReturnValue({
      tasks: [mockTask],
      isLoading: false,
      error: null,
      addTask: mockAddTask,
      updateTask: mockUpdateTask,
      toggleTask: mockToggleTask,
      moveTask: mockMoveTask,
      deleteTask: mockDeleteTask,
      fetchTask: vi.fn(),
      refetch: mockRefetch,
    })
    vi.mocked(useSubtasks).mockReturnValue({
      subtasks: [
        { id: 's1', title: 'Subtask 1', completed: true, gtd_status: 'inbox', tags: [], subtasks_count: 0, subtasks_completed: 0, user_id: 'u1', created_at: '', updated_at: '' } as Task,
        { id: 's2', title: 'Subtask 2', completed: false, gtd_status: 'inbox', tags: [], subtasks_count: 0, subtasks_completed: 0, user_id: 'u1', created_at: '', updated_at: '' } as Task,
      ],
      isLoading: false,
      error: null,
      addSubtask: mockAddSubtask,
      toggleSubtask: mockToggleSubtask,
      deleteSubtask: mockDeleteSubtask,
      refetch: mockSubtaskRefetch,
    })
    vi.mocked(useTaskFilter).mockReturnValue({
      filters: { gtd_status: 'inbox' },
      searchInput: '',
      setSearchInput: vi.fn(),
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
    })
  })

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <GtdTaskList gtdStatus="inbox" title="Inbox" />
      </MemoryRouter>
    )
  }

  describe('subtask count display', () => {
    it('renders subtask count indicator', () => {
      renderComponent()
      expect(screen.getByText('1/2')).toBeInTheDocument()
    })
  })

  describe('subtask section', () => {
    it('renders subtask toggle button', () => {
      renderComponent()
      expect(screen.getByText('1/2 подзадач')).toBeInTheDocument()
    })

    it('expands subtask section on click', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument()
        expect(screen.getByText('Subtask 2')).toBeInTheDocument()
      })
    })

    it('shows checkboxes for subtasks', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('has completed subtask checked', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument()
      })
      const st1Container = screen.getByText('Subtask 1').closest('div')
      const checkbox = st1Container?.querySelector('input[type="checkbox"]')
      expect(checkbox?.checked).toBe(true)
    })

    it('has incomplete subtask unchecked', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => {
        expect(screen.getByText('Subtask 2')).toBeInTheDocument()
      })
      const st2Container = screen.getByText('Subtask 2').closest('div')
      const checkbox = st2Container?.querySelector('input[type="checkbox"]')
      expect(checkbox?.checked).toBe(false)
    })

    it('shows line-through for completed subtask', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => {
        const st1 = screen.getByText('Subtask 1')
        expect(st1.className).toContain('line-through')
      })
    })
  })

  describe('add subtask', () => {
    it('shows input for new subtask when expanded', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Новая подзадача...')).toBeInTheDocument()
      })
    })

    it('shows add button when expanded', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => {
        expect(screen.getByText('+ Добавить')).toBeInTheDocument()
      })
    })

    it('calls addSubtask on Enter', async () => {
      const user = userEvent.setup()
      mockAddSubtask.mockResolvedValue(undefined)
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => expect(screen.getByPlaceholderText('Новая подзадача...')).toBeInTheDocument())
      await user.type(screen.getByPlaceholderText('Новая подзадача...'), 'New subtask{Enter}')
      await waitFor(() => {
        expect(mockAddSubtask).toHaveBeenCalledWith('New subtask')
      })
    })
  })

  describe('toggle subtask', () => {
    it('calls toggleSubtask on checkbox click', async () => {
      const user = userEvent.setup()
      mockToggleSubtask.mockResolvedValue(undefined)
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => expect(screen.getByText('Subtask 2')).toBeInTheDocument())
      const st2Container = screen.getByText('Subtask 2').closest('div')
      const checkbox = st2Container?.querySelector('input[type="checkbox"]')
      expect(checkbox).toBeTruthy()
      if (checkbox) await user.click(checkbox)
      expect(mockToggleSubtask).toHaveBeenCalledWith('s2')
    })
  })

  describe('delete subtask', () => {
    it('renders delete buttons for subtasks', async () => {
      const user = userEvent.setup()
      renderComponent()
      await user.click(screen.getByText('1/2 подзадач'))
      await waitFor(() => expect(screen.getByText('Subtask 1')).toBeInTheDocument())
      const deleteButtons = screen.getAllByText('✕')
      expect(deleteButtons.length).toBe(2)
    })
  })
})
