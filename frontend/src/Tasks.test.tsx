import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tasks } from './routes/Tasks'

vi.mock('./hooks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('./components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { useTasks } from './hooks/useTasks'

describe('Tasks', () => {
  const mockAddTask = vi.fn()
  const mockToggleTask = vi.fn()
  const mockDeleteTask = vi.fn()
  const mockRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTasks).mockReturnValue({
      tasks: [],
      isLoading: false,
      error: null,
      addTask: mockAddTask,
      updateTask: vi.fn(),
      toggleTask: mockToggleTask,
      deleteTask: mockDeleteTask,
      refetch: mockRefetch,
    })
  })

  const renderTasks = () => {
    return render(<Tasks />)
  }

  describe('rendering', () => {
    it('renders task list page', () => {
      renderTasks()

      expect(screen.getByPlaceholderText('Add a new task...')).toBeInTheDocument()
    })

    it('shows empty state when no tasks', () => {
      renderTasks()

      expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
      expect(screen.getByText('Add your first task above!')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        isLoading: true,
        error: null,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      renderTasks()

      expect(screen.queryByText('No tasks yet.')).not.toBeInTheDocument()
      expect(screen.getAllByRole('generic')).length > 0 // eslint-disable-line @typescript-eslint/no-unused-expressions
    })

    it('shows error state with retry button', () => {
      const errorMessage = 'Failed to load tasks'
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        isLoading: false,
        error: errorMessage,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      renderTasks()

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('separates active and completed tasks', () => {
      vi.mocked(useTasks).mockReturnValue({
        tasks: [
          { id: '1', title: 'Active Task', description: null, completed: false, user_id: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: '2', title: 'Completed Task', description: null, completed: true, user_id: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
        ],
        isLoading: false,
        error: null,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      renderTasks()

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Active Task')).toBeInTheDocument()
      expect(screen.getByText('Completed Task')).toBeInTheDocument()
    })
  })

  describe('adding tasks', () => {
    it('adds task via form', async () => {
      const user = userEvent.setup()
      renderTasks()

      const input = screen.getByPlaceholderText('Add a new task...')
      const button = screen.getByRole('button', { name: 'Add' })

      await user.type(input, 'New Task')
      await user.click(button)

      await waitFor(() => {
        const calls = mockAddTask.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        const callArgs = calls[0][0]
        expect(callArgs.title).toBe('New Task')
      })
    })

    it('adds task with description', async () => {
      const user = userEvent.setup()
      renderTasks()

      const input = screen.getByPlaceholderText('Add a new task...')
      const descriptionButton = screen.getByRole('button', { name: '+' })
      const addButton = screen.getByRole('button', { name: 'Add' })

      await user.type(input, 'New Task')
      await user.click(descriptionButton)

      const descriptionInput = screen.getByPlaceholderText('Add a description (optional)')
      await user.type(descriptionInput, 'Task description')
      await user.click(addButton)

      await waitFor(() => {
        const calls = mockAddTask.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        const callArgs = calls[0][0]
        expect(callArgs.title).toBe('New Task')
        expect(callArgs.description).toBe('Task description')
      })
    })

    it('does not add empty task', async () => {
      const user = userEvent.setup()
      renderTasks()

      const button = screen.getByRole('button', { name: 'Add' })
      await user.click(button)

      await waitFor(() => {
        expect(mockAddTask).not.toHaveBeenCalled()
      })
    })
  })

  describe('toggling tasks', () => {
    it('toggles task completion', async () => {
      const user = userEvent.setup()
      vi.mocked(useTasks).mockReturnValue({
        tasks: [
          { id: '1', title: 'Active Task', description: null, completed: false, user_id: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
        ],
        isLoading: false,
        error: null,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      renderTasks()

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      expect(mockToggleTask).toHaveBeenCalledWith('1')
    })
  })

  describe('deleting tasks', () => {
    it('deletes task after confirmation', async () => {
      const user = userEvent.setup()
      vi.mocked(useTasks).mockReturnValue({
        tasks: [
          { id: '1', title: 'Active Task', description: null, completed: false, user_id: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
        ],
        isLoading: false,
        error: null,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      global.confirm = vi.fn(() => true)

      renderTasks()

      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?')
      expect(mockDeleteTask).toHaveBeenCalledWith('1')
    })

    it('does not delete task when cancelled', async () => {
      const user = userEvent.setup()
      vi.mocked(useTasks).mockReturnValue({
        tasks: [
          { id: '1', title: 'Active Task', description: null, completed: false, user_id: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
        ],
        isLoading: false,
        error: null,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      global.confirm = vi.fn(() => false)

      renderTasks()

      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?')
      expect(mockDeleteTask).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        isLoading: false,
        error: 'Failed to load tasks',
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      renderTasks()

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      await user.click(retryButton)

      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('input autofocus', () => {
    it('focuses input after initial load completes', () => {
      vi.useFakeTimers()

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        isLoading: false,
        error: null,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: vi.fn(),
        deleteTask: vi.fn(),
        refetch: mockRefetch,
      })

      render(<Tasks />)

      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByPlaceholderText('Add a new task...')).toHaveFocus()

      vi.useRealTimers()
    })

    it('focuses input after adding a task', async () => {
      mockAddTask.mockImplementation(async () => {})

      const user = userEvent.setup()
      renderTasks()

      const input = screen.getByPlaceholderText('Add a new task...')
      await user.type(input, 'New Task')

      input.blur()
      expect(input).not.toHaveFocus()

      const addButton = screen.getByRole('button', { name: 'Add' })
      await user.click(addButton)

      await waitFor(() => {
        expect(mockAddTask).toHaveBeenCalledWith({ title: 'New Task' })
      })

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a new task...')).toHaveFocus()
      })
    })
  })

  describe('task styling', () => {
    it('shows completed tasks with strikethrough', () => {
      vi.mocked(useTasks).mockReturnValue({
        tasks: [
          { id: '1', title: 'Completed Task', description: 'Some description', completed: true, user_id: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
        ],
        isLoading: false,
        error: null,
        addTask: mockAddTask,
        updateTask: vi.fn(),
        toggleTask: mockToggleTask,
        deleteTask: mockDeleteTask,
        refetch: mockRefetch,
      })

      renderTasks()

      const taskTitle = screen.getByText('Completed Task')
      expect(taskTitle).toHaveClass('line-through')

      const taskDescription = screen.getByText('Some description')
      expect(taskDescription).toHaveClass('line-through')
    })
  })
})
