import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Task } from './hooks/useTasks'

vi.mock('./hooks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('./hooks/useChecklist', () => ({
  useChecklist: vi.fn(),
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
import { useChecklist } from './hooks/useChecklist'
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
  position: 0,
  due_date: null,
  notes: null,
  tags: [],
  checklist_total: 2,
  checklist_completed: 1,
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
  vi.mocked(useChecklist).mockReturnValue({
    items: [],
    isLoading: false,
    error: null,
    addItem: vi.fn(),
    toggleItem: vi.fn(),
    deleteItem: vi.fn(),
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

describe('TaskListView — checklist indicator', () => {
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

  it('renders checklist count indicator in task list', async () => {
    const { GtdTaskList } = await import('./routes/GtdTaskList')
    render(
      <MemoryRouter>
        <GtdTaskList gtdStatus="inbox" title="Inbox" />
      </MemoryRouter>
    )
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('does not render checklist section or add button in task list', async () => {
    const { GtdTaskList } = await import('./routes/GtdTaskList')
    render(
      <MemoryRouter>
        <GtdTaskList gtdStatus="inbox" title="Inbox" />
      </MemoryRouter>
    )
    expect(screen.queryByText('1/2 пунктов')).not.toBeInTheDocument()
    expect(screen.queryByText('+ Пункт')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Новый пункт...')).not.toBeInTheDocument()
  })
})

describe('TaskEditModal — checklist', () => {
  const mockAddItem = vi.fn()
  const mockToggleItem = vi.fn()
  const mockDeleteItem = vi.fn()
  const mockRefetch = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useChecklist).mockReturnValue({
      items: [
        { id: 'c1', task_id: 't1', title: 'Item 1', is_completed: true, position: 0, completed_at: null, created_at: '', updated_at: '' },
        { id: 'c2', task_id: 't1', title: 'Item 2', is_completed: false, position: 1, completed_at: null, created_at: '', updated_at: '' },
      ],
      isLoading: false,
      error: null,
      addItem: mockAddItem,
      toggleItem: mockToggleItem,
      deleteItem: mockDeleteItem,
      refetch: mockRefetch,
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

  it('renders checklist accordion', async () => {
    await renderModal()
    expect(screen.getByText('Чеклист (1/2)')).toBeInTheDocument()
  })

  it('shows checklist items after expanding accordion', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
  })

  it('shows checkboxes for checklist items', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('has completed item checked', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })
    const item1Container = screen.getByText('Item 1').closest('div')
    const checkbox = item1Container?.querySelector('input[type="checkbox"]')
    expect(checkbox?.checked).toBe(true)
  })

  it('has incomplete item unchecked', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => {
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
    const item2Container = screen.getByText('Item 2').closest('div')
    const checkbox = item2Container?.querySelector('input[type="checkbox"]')
    expect(checkbox?.checked).toBe(false)
  })

  it('shows line-through for completed item', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => {
      const item1 = screen.getByText('Item 1')
      expect(item1.className).toContain('line-through')
    })
  })

  it('shows input for new checklist item when expanded', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Новый пункт...')).toBeInTheDocument()
    })
  })

  it('calls addItem on Enter', async () => {
    const user = userEvent.setup()
    mockAddItem.mockResolvedValue(undefined)
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => expect(screen.getByPlaceholderText('Новый пункт...')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText('Новый пункт...'), 'New item{Enter}')
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith('New item')
    })
  })

  it('calls toggleItem on checkbox click', async () => {
    const user = userEvent.setup()
    mockToggleItem.mockResolvedValue(undefined)
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => expect(screen.getByText('Item 2')).toBeInTheDocument())
    const item2Container = screen.getByText('Item 2').closest('div')
    const checkbox = item2Container?.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeTruthy()
    if (checkbox) await user.click(checkbox)
    expect(mockToggleItem).toHaveBeenCalledWith('c2')
  })

  it('renders delete buttons for checklist items', async () => {
    const user = userEvent.setup()
    await renderModal()
    await user.click(screen.getByText('Чеклист (1/2)'))
    await waitFor(() => expect(screen.getByText('Item 1')).toBeInTheDocument())
    const deleteButtons = screen.getAllByText('✕')
    expect(deleteButtons.length).toBe(2)
  })
})
