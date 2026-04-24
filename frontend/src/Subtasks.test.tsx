import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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

vi.mock('./components/TaskFilterPanel', () => ({
  TaskFilterPanel: () => <div data-testid="filter-panel">Filter Panel</div>,
  HighlightText: ({ text }: { text: string }) => <>{text}</>,
}))

vi.mock('./components/RecurrenceEditor', () => ({
  RecurrenceEditor: () => <div>Recurrence Editor</div>,
}))

vi.mock('./components/ReminderEditor', () => ({
  ReminderEditor: () => <div>Reminder Editor</div>,
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
  is_recurring: false,
  recurrence_type: null,
  recurrence_config: null,
  recurrence_end_date: null,
  reminder_time: null,
  reminder_offsets: null,
  reminder_fired: false,
}

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  get length() { return 0 },
  key: vi.fn(),
}

vi.stubGlobal('localStorage', localStorageMock)

function setupListMocks() {
  vi.mocked(useTasks).mockReturnValue({
    tasks: [mockTask],
    isLoading: false,
    error: null,
    addTask: vi.fn(),
    updateTask: vi.fn(),
    toggleTask: vi.fn(),
    moveTask: vi.fn(),
    deleteTask: vi.fn(),
    fetchTask: vi.fn(),
    refetch: vi.fn(),
  })
  vi.mocked(useSubtasks).mockReturnValue({
    subtasks: [],
    isLoading: false,
    error: null,
    addSubtask: vi.fn(),
    toggleSubtask: vi.fn(),
    deleteSubtask: vi.fn(),
    refetch: vi.fn(),
  })
  vi.mocked(useTaskFilter).mockReturnValue({
    filters: { gtd_status: 'inbox' },
    searchInput: '',
    setSearchInput: vi.fn(),
    updateFilter: vi.fn(),
    clearFilters: vi.fn(),
    hasActiveFilters: false,
  })
}

describe('TaskListView — subtask indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    setupListMocks()
    vi.doMock('./components/TaskEditModal', () => ({
      TaskEditModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="edit-modal">Edit Modal</div> : null,
    }))
  })

  afterEach(() => {
    vi.doUnmock('./components/TaskEditModal')
  })

  it('renders subtask count indicator in task list', async () => {
    const { GtdTaskList } = await import('./routes/GtdTaskList')
    render(
      <MemoryRouter>
        <GtdTaskList gtdStatus="inbox" title="Inbox" />
      </MemoryRouter>
    )
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('does not render subtask section or add button in task list', async () => {
    const { GtdTaskList } = await import('./routes/GtdTaskList')
    render(
      <MemoryRouter>
        <GtdTaskList gtdStatus="inbox" title="Inbox" />
      </MemoryRouter>
    )
    expect(screen.queryByText('1/2 подзадач')).not.toBeInTheDocument()
    expect(screen.queryByText('+ Подзадача')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Новая подзадача...')).not.toBeInTheDocument()
  })
})

describe('TaskEditModal — subtasks', () => {
  const mockAddSubtask = vi.fn()
  const mockToggleSubtask = vi.fn()
  const mockDeleteSubtask = vi.fn()
  const mockSubtaskRefetch = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  const renderModal = async () => {
    const { TaskEditModal } = await import('./components/TaskEditModal')
    return render(
      <MemoryRouter>
        <TaskEditModal task={mockTask} isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
      </MemoryRouter>
    )
  }

  it('renders subtasks accordion', async () => {
    await renderModal()
    expect(screen.getByText('Подзадачи (1/2)')).toBeInTheDocument()
  })

  it('shows subtasks after expanding accordion', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => {
      expect(screen.getByText('Subtask 1')).toBeInTheDocument()
      expect(screen.getByText('Subtask 2')).toBeInTheDocument()
    })
  })

  it('shows checkboxes for subtasks', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('has completed subtask checked', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => {
      expect(screen.getByText('Subtask 1')).toBeInTheDocument()
    })
    const st1Container = screen.getByText('Subtask 1').closest('div')
    const checkbox = st1Container?.querySelector('input[type="checkbox"]')
    expect(checkbox?.checked).toBe(true)
  })

  it('has incomplete subtask unchecked', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => {
      expect(screen.getByText('Subtask 2')).toBeInTheDocument()
    })
    const st2Container = screen.getByText('Subtask 2').closest('div')
    const checkbox = st2Container?.querySelector('input[type="checkbox"]')
    expect(checkbox?.checked).toBe(false)
  })

  it('shows line-through for completed subtask', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => {
      const st1 = screen.getByText('Subtask 1')
      expect(st1.className).toContain('line-through')
    })
  })

  it('shows input for new subtask when expanded', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Новая подзадача...')).toBeInTheDocument()
    })
  })

  it('calls addSubtask on Enter', async () => {
    const user = userEvent.setup()
    mockAddSubtask.mockResolvedValue(undefined)
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => expect(screen.getByPlaceholderText('Новая подзадача...')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText('Новая подзадача...'), 'New subtask{Enter}')
    await waitFor(() => {
      expect(mockAddSubtask).toHaveBeenCalledWith('New subtask')
    })
  })

  it('calls toggleSubtask on checkbox click', async () => {
    const user = userEvent.setup()
    mockToggleSubtask.mockResolvedValue(undefined)
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => expect(screen.getByText('Subtask 2')).toBeInTheDocument())
    const st2Container = screen.getByText('Subtask 2').closest('div')
    const checkbox = st2Container?.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeTruthy()
    if (checkbox) await user.click(checkbox)
    expect(mockToggleSubtask).toHaveBeenCalledWith('s2')
  })

  it('renders delete buttons for subtasks', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Подзадачи (1/2)'))
    await waitFor(() => expect(screen.getByText('Subtask 1')).toBeInTheDocument())
    const deleteButtons = screen.getAllByText('✕')
    expect(deleteButtons.length).toBe(2)
  })
})
