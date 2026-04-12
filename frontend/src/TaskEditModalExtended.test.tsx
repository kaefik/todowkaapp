import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskEditModal } from './components/TaskEditModal'
import type { Task } from './hooks/useTasks'
import type { Tag } from './hooks/useTags'

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

import { useTasks } from './hooks/useTasks'
import { useContexts } from './hooks/useContexts'
import { useAreas } from './hooks/useAreas'
import { useTags } from './hooks/useTags'
import { useProjects } from './hooks/useProjects'

describe('TaskEditModal — новые поля', () => {
  const mockFetchTask = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    completed: false,
    gtd_status: 'inbox',
    context_id: 'ctx1',
    area_id: 'area1',
    project_id: 'proj1',
    parent_task_id: null,
    position: 0,
    due_date: '2026-04-15T00:00:00',
    notes: 'Some notes',
    tags: [{ id: 'tag1', name: 'Urgent', color: '#FF0000' }] as Tag[],
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
      contexts: [{ id: 'ctx1', name: 'Office', color: '#000', icon: null, user_id: 'u1', created_at: '' }],
      isLoading: false,
      error: null,
      addContext: vi.fn(),
      updateContext: vi.fn(),
      deleteContext: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useAreas).mockReturnValue({
      areas: [{ id: 'area1', name: 'Health', description: null, color: null, user_id: 'u1', created_at: '' }],
      isLoading: false,
      error: null,
      addArea: vi.fn(),
      updateArea: vi.fn(),
      deleteArea: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      tags: [
        { id: 'tag1', name: 'Urgent', color: '#FF0000', user_id: 'u1', created_at: '' },
        { id: 'tag2', name: 'Low', color: '#00FF00', user_id: 'u1', created_at: '' },
      ],
      isLoading: false,
      error: null,
      addTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useProjects).mockReturnValue({
      projects: [
        { id: 'proj1', name: 'Project A', description: null, color: null, area_id: null, is_active: true, progress: { tasks_total: 0, tasks_completed: 0, progress_percent: 0 }, user_id: 'u1', created_at: '', updated_at: '' },
      ],
      isLoading: false,
      error: null,
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refetch: vi.fn(),
    })
  })

  const renderModal = (task: Task | null = mockTask) => {
    return render(
      <TaskEditModal task={task} isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    )
  }

  describe('GTD status field', () => {
    it('renders GTD status select', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('GTD-статус')).toBeInTheDocument())
    })

    it('shows all GTD status options', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('GTD-статус')).toBeInTheDocument())
      expect(screen.getByText('Inbox')).toBeInTheDocument()
      expect(screen.getByText('Next Action')).toBeInTheDocument()
      expect(screen.getByText('Waiting For')).toBeInTheDocument()
      expect(screen.getByText('Someday / Maybe')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Trash')).toBeInTheDocument()
    })

    it('has current GTD status selected', async () => {
      renderModal()
      await waitFor(() => {
        expect((screen.getByLabelText('GTD-статус') as HTMLSelectElement).value).toBe('inbox')
      })
    })

    it('can change GTD status', async () => {
      const user = userEvent.setup()
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('GTD-статус')).toBeInTheDocument())
      await user.selectOptions(screen.getByLabelText('GTD-статус'), 'next')
      expect((screen.getByLabelText('GTD-статус') as HTMLSelectElement).value).toBe('next')
    })
  })

  describe('context field', () => {
    it('renders context select', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('Контекст')).toBeInTheDocument())
    })

    it('shows context options', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Office')).toBeInTheDocument())
    })

    it('shows "Без контекста" option', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Без контекста')).toBeInTheDocument())
    })
  })

  describe('area field', () => {
    it('renders area select', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('Область')).toBeInTheDocument())
    })

    it('shows area options', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Health')).toBeInTheDocument())
    })

    it('shows "Без области" option', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Без области')).toBeInTheDocument())
    })
  })

  describe('project field', () => {
    it('renders project select', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('Проект')).toBeInTheDocument())
    })

    it('shows project options', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Project A')).toBeInTheDocument())
    })

    it('shows "Без проекта" option', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Без проекта')).toBeInTheDocument())
    })
  })

  describe('due_date field', () => {
    it('renders due date input', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('Дедлайн')).toBeInTheDocument())
    })

    it('has date type input', async () => {
      renderModal()
      await waitFor(() => {
        expect((screen.getByLabelText('Дедлайн') as HTMLInputElement).type).toBe('date')
      })
    })

    it('populates due_date from task', async () => {
      renderModal()
      await waitFor(() => {
        expect((screen.getByLabelText('Дедлайн') as HTMLInputElement).value).toBe('2026-04-15')
      })
    })
  })

  describe('notes field', () => {
    it('renders notes textarea', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('Заметки')).toBeInTheDocument())
    })

    it('populates notes from task', async () => {
      renderModal()
      await waitFor(() => {
        expect((screen.getByLabelText('Заметки') as HTMLTextAreaElement).value).toBe('Some notes')
      })
    })
  })

  describe('tags field', () => {
    it('renders tags label', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Теги')).toBeInTheDocument())
    })

    it('shows available tags', async () => {
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Urgent')).toBeInTheDocument()
        expect(screen.getByText('Low')).toBeInTheDocument()
      })
    })

    it('shows selected tag with colored style', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByText('Urgent')).toBeInTheDocument())
      const urgentBtn = screen.getByText('Urgent').closest('button')
      expect(urgentBtn).toBeInTheDocument()
      expect(urgentBtn?.style.backgroundColor).toBe('rgb(255, 0, 0)')
    })

    it('toggles tag selection on click', async () => {
      const user = userEvent.setup()
      renderModal()
      await waitFor(() => expect(screen.getByText('Low')).toBeInTheDocument())
      await user.click(screen.getByText('Low'))
      const lowBtn = screen.getByText('Low').closest('button')
      expect(lowBtn?.style.backgroundColor).toBeTruthy()
    })

    it('deselects tag on second click', async () => {
      const user = userEvent.setup()
      renderModal()
      await waitFor(() => expect(screen.getByText('Urgent')).toBeInTheDocument())
      await user.click(screen.getByText('Urgent'))
      const urgentBtn = screen.getByText('Urgent').closest('button')
      expect(urgentBtn?.style.backgroundColor).toBeFalsy()
    })
  })

  describe('save with all fields', () => {
    it('calls onSave with tag_ids', async () => {
      const user = userEvent.setup()
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument())
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('1', expect.objectContaining({
          tag_ids: ['tag1'],
        }))
      })
    })

    it('calls onSave with all new fields', async () => {
      renderModal()
      await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument())
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('1', expect.objectContaining({
          context_id: 'ctx1',
          area_id: 'area1',
          project_id: 'proj1',
          gtd_status: 'inbox',
          due_date: '2026-04-15',
          notes: 'Some notes',
        }))
      })
    })
  })
})
