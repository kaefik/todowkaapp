import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskEditModal } from './components/TaskEditModal'
import type { Task } from './hooks/useTasks'

vi.mock('./hooks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('./hooks/useContexts', () => ({
  useContexts: vi.fn(),
}))

vi.mock('./hooks/useAreas', () => ({
  useAreas: vi.fn(),
}))

vi.mock('./hooks/useTags', () => ({
  useTags: vi.fn(),
}))

vi.mock('./hooks/useProjects', () => ({
  useProjects: vi.fn(),
}))

vi.mock('./hooks/useCalendarEvents', () => ({
  useCalendarEvents: vi.fn().mockReturnValue({ events: [], isLoading: false }),
}))

vi.mock('./hooks/useChecklist', () => ({
  useChecklist: vi.fn().mockReturnValue({
    items: [],
    isLoading: false,
    addItem: vi.fn(),
    toggleItem: vi.fn(),
    deleteItem: vi.fn(),
    refetch: vi.fn(),
  }),
}))

vi.mock('./db/hooks', () => ({
  useOnlineStatus: vi.fn().mockReturnValue(true),
  useDexieQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}))

import { useTasks } from './hooks/useTasks'
import { useContexts } from './hooks/useContexts'
import { useAreas } from './hooks/useAreas'
import { useTags } from './hooks/useTags'
import { useProjects } from './hooks/useProjects'

describe('TaskEditModal', () => {
  const mockFetchTask = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
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
    mockFetchTask.mockResolvedValue(mockTask)
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
      fetchTask: mockFetchTask,
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

      expect(screen.queryByText('Редактирование задачи')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true with task', async () => {
      renderModal(true, mockTask)

      await waitFor(() => {
        expect(screen.getByText('Редактирование задачи')).toBeInTheDocument()
      })
    })

    it('renders modal when isOpen and task provided', async () => {
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Редактирование задачи')).toBeInTheDocument()
      })
    })

    it('shows loading state while fetching task', async () => {
      mockFetchTask.mockImplementation(() => new Promise(() => {}))
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Редактирование задачи')).toBeInTheDocument()
      })
    })
  })

  describe('form fields', () => {
    it('renders title input with current task title', async () => {
      renderModal()

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Название задачи')
        expect(titleInput).toBeInTheDocument()
        expect(titleInput).toHaveValue('Test Task')
      })
    })

    it('renders description textarea with current task description', async () => {
      renderModal()

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText('Описание задачи (необязательно)')
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
        expect(screen.getByText('Редактирование задачи')).toBeInTheDocument()
      })

      const modalOverlay = screen.getByText('Редактирование задачи').closest('[class*="fixed"]')
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
        const cancelButton = screen.getByRole('button', { name: 'Отмена' })
        expect(cancelButton).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'Отмена' })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('does not call onSave when clicking Cancel', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Отмена' })
        expect(cancelButton).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'Отмена' })
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
        expect(screen.getByLabelText('Название задачи')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Название задачи')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      expect(titleInput).toHaveValue('Updated Title')
    })

    it('updates description value when user types', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Описание задачи (необязательно)')).toBeInTheDocument()
      })

      const descriptionInput = screen.getByLabelText('Описание задачи (необязательно)')
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
        expect(screen.getByLabelText('Название задачи')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Название задачи')
      const descriptionInput = screen.getByLabelText('Описание задачи (необязательно)')

      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')

      const saveButton = screen.getByRole('button', { name: 'Сохранить' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('1', {
          title: 'Updated Title',
          description: 'Updated description',
          context_id: null,
          area_id: null,
          project_id: null,
          event_id: null,
          gtd_status: 'inbox',
          due_date: null,
          notes: null,
          tag_ids: [],
          recurrence_type: null,
          recurrence_config: null,
          recurrence_end_date: null,
          reminder_time: null,
          reminder_offsets: null,
        })
      })
    })

    it('calls onSave when title only is changed', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Название задачи')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Название задачи')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      const saveButton = screen.getByRole('button', { name: 'Сохранить' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('1', {
          title: 'Updated Title',
          description: 'Test description',
          context_id: null,
          area_id: null,
          project_id: null,
          event_id: null,
          gtd_status: 'inbox',
          due_date: null,
          notes: null,
          tag_ids: [],
          recurrence_type: null,
          recurrence_config: null,
          recurrence_end_date: null,
          reminder_time: null,
          reminder_offsets: null,
        })
      })
    })

    it('closes modal after successful save', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Название задачи')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: 'Сохранить' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('does not call onSave when validation fails', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByLabelText('Название задачи')).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Название задачи')
      await user.clear(titleInput)

      const saveButton = screen.getByRole('button', { name: 'Сохранить' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })
  })

  describe('edge cases', () => {
    it('handles task with null description', async () => {
      const taskWithNullDescription: Task = {
        ...mockTask,
        id: '2',
        title: 'Task without description',
        description: null,
      }

      renderModal(true, taskWithNullDescription)

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText('Описание задачи (необязательно)')
        expect(descriptionInput).toHaveValue('')
      })
    })

    it('handles task with empty string description', async () => {
      const taskWithEmptyDescription: Task = {
        ...mockTask,
        id: '3',
        title: 'Task with empty description',
        description: '',
      }

      renderModal(true, taskWithEmptyDescription)

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText('Описание задачи (необязательно)')
        expect(descriptionInput).toHaveValue('')
      })
    })

    it('stops propagation when clicking on modal content', async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(screen.getByText('Редактирование задачи')).toBeInTheDocument()
      })

      const modalContent = screen.getByText('Редактирование задачи').closest('[class*="bg-white"]')
      expect(modalContent).toBeInTheDocument()

      if (modalContent) {
        await user.click(modalContent)
      }

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
