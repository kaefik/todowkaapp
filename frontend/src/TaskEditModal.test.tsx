import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskEditModal } from './components/TaskEditModal'
import type { Task } from './hooks/useTasks'

vi.mock('./hooks/useTasks', () => ({
  useTasks: vi.fn(),
}))

import { useTasks } from './hooks/useTasks'

describe('TaskEditModal', () => {
  const mockFetchTask = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    completed: false,
    user_id: 'user1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchTask.mockResolvedValue(mockTask)
    vi.mocked(useTasks).mockReturnValue({
      tasks: [],
      isLoading: false,
      error: null,
      addTask: vi.fn(),
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      deleteTask: vi.fn(),
      refetch: vi.fn(),
      fetchTask: mockFetchTask,
    })
  })

  const renderModal = (isOpen: boolean = true, task: Task | null = mockTask) => {
    return render(
      <TaskEditModal
        task={task}
        isOpen={isOpen}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )
  }

  describe('rendering', () => {
    it('does not render when isOpen is false', () => {
      renderModal(false)

      expect(screen.queryByText('Edit Task')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true (even with null task)', async () => {
      renderModal(true, null)

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })
    })

    it('renders modal when isOpen and task provided', async () => {
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })
    })

    it('shows loading state while fetching task', async () => {
      mockFetchTask.mockImplementation(() => new Promise(() => {}))
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })
    })

    it('shows error when fetch fails', async () => {
      mockFetchTask.mockRejectedValue(new Error('Failed to load task'))
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Failed to load task')).toBeInTheDocument()
      })
    })
  })

  describe('form fields', () => {
    it('renders title input with current task title', async () => {
      renderModal()

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Title')
        expect(titleInput).toBeInTheDocument()
        expect(titleInput).toHaveValue('Test Task')
      })
    })

    it('renders description textarea with current task description', async () => {
      renderModal()

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText('Description')
        expect(descriptionInput).toBeInTheDocument()
        expect(descriptionInput).toHaveValue('Test description')
      })
    })
  })

  describe('actions', () => {
    it('closes modal when clicking outside', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const modalOverlay = screen.getByText('Edit Task').closest('[class*="fixed"]')
      expect(modalOverlay).toBeInTheDocument()

      if (modalOverlay) {
        await user.click(modalOverlay)
      }

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('closes modal when clicking Cancel button', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' })
        expect(cancelButton).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('does not call onSave when clicking Cancel', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' })
        expect(cancelButton).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })
  })

  describe('editing task', () => {
    it('updates title value when user types', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      expect(titleInput).toHaveValue('Updated Title')
    })

    it('updates description value when user types', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Description')).toBeInTheDocument()
      })

      const descriptionInput = screen.getByLabelText('Description')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')

      expect(descriptionInput).toHaveValue('Updated description')
    })
  })

  describe('saving', () => {
    it('calls onSave with updated data when Save is clicked', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Title')
      const descriptionInput = screen.getByLabelText('Description')

      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')

      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('1', {
          title: 'Updated Title',
          description: 'Updated description',
          context_id: null,
          area_id: null,
          tag_ids: [],
        })
      })
    })

    it('calls onSave when title only is changed', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('1', {
          title: 'Updated Title',
          description: 'Test description',
          context_id: null,
          area_id: null,
          tag_ids: [],
        })
      })
    })

    it('closes modal after successful save', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('does not call onSave when validation fails', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)

      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })
  })

  describe('edge cases', () => {
    it('handles task with null description', async () => {
      const taskWithNullDescription: Task = {
        id: '2',
        title: 'Task without description',
        description: null,
        completed: false,
        user_id: 'user1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      mockFetchTask.mockResolvedValue(taskWithNullDescription)
      renderModal(true, taskWithNullDescription)

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText('Description')
        expect(descriptionInput).toHaveValue('')
      })
    })

    it('handles task with empty string description', async () => {
      const taskWithEmptyDescription: Task = {
        id: '3',
        title: 'Task with empty description',
        description: '',
        completed: false,
        user_id: 'user1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      mockFetchTask.mockResolvedValue(taskWithEmptyDescription)
      renderModal(true, taskWithEmptyDescription)

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText('Description')
        expect(descriptionInput).toHaveValue('')
      })
    })

    it('stops propagation when clicking on modal content', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })

      const modalContent = screen.getByText('Edit Task').closest('[class*="bg-white"]')
      expect(modalContent).toBeInTheDocument()

      if (modalContent) {
        await user.click(modalContent)
      }

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
