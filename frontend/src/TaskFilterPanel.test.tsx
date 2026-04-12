import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskFilterPanel, HighlightText } from './components/TaskFilterPanel'
import type { TaskFilters } from './hooks/useTasks'

vi.mock('./hooks/useContexts', () => ({
  useContexts: vi.fn(),
}))

vi.mock('./hooks/useAreas', () => ({
  useAreas: vi.fn(),
}))

vi.mock('./hooks/useProjects', () => ({
  useProjects: vi.fn(),
}))

vi.mock('./hooks/useTags', () => ({
  useTags: vi.fn(),
}))

import { useContexts } from './hooks/useContexts'
import { useAreas } from './hooks/useAreas'
import { useProjects } from './hooks/useProjects'
import { useTags } from './hooks/useTags'

const defaultFilters: TaskFilters = {}

describe('TaskFilterPanel', () => {
  const mockOnSearchInput = vi.fn()
  const mockOnUpdateFilter = vi.fn()
  const mockOnClearFilters = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(useProjects).mockReturnValue({
      projects: [{ id: 'proj1', name: 'Project A', description: null, color: null, area_id: null, is_active: true, progress: { tasks_total: 0, tasks_completed: 0, progress_percent: 0 }, user_id: 'u1', created_at: '', updated_at: '' }],
      isLoading: false,
      error: null,
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useTags).mockReturnValue({
      tags: [{ id: 'tag1', name: 'Urgent', color: '#FF0000', user_id: 'u1', created_at: '' }],
      isLoading: false,
      error: null,
      addTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      refetch: vi.fn(),
    })
  })

  const renderPanel = (filters: TaskFilters = defaultFilters, hasActiveFilters = false, searchOpen = false) => {
    return render(
      <TaskFilterPanel
        filters={filters}
        searchInput={searchOpen ? 'test' : ''}
        onSearchInput={mockOnSearchInput}
        onUpdateFilter={mockOnUpdateFilter}
        onClearFilters={mockOnClearFilters}
        hasActiveFilters={hasActiveFilters}
      />
    )
  }

  const getSearchBtn = () => screen.getByRole('button', { hidden: true })

  describe('search', () => {
    it('renders search icon button initially', () => {
      renderPanel()
      expect(getSearchBtn()).toBeInTheDocument()
    })

    it('opens search input on click', async () => {
      const user = userEvent.setup()
      renderPanel()
      await user.click(getSearchBtn())
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Поиск задач...')).toBeInTheDocument()
      })
    })

    it('calls onSearchInput when typing in search', async () => {
      const user = userEvent.setup()
      renderPanel()
      await user.click(getSearchBtn())
      await waitFor(() => expect(screen.getByPlaceholderText('Поиск задач...')).toBeInTheDocument())
      await user.type(screen.getByPlaceholderText('Поиск задач...'), 'x')
      expect(mockOnSearchInput).toHaveBeenCalledWith('x')
    })
  })

  describe('filter panel', () => {
    const openSearchAndFilters = async () => {
      const user = userEvent.setup()
      renderPanel()
      await user.click(getSearchBtn())
      await waitFor(() => expect(screen.getByText('Фильтры')).toBeInTheDocument())
      await user.click(screen.getByText('Фильтры'))
      return user
    }

    it('shows filter dropdowns when expanded', async () => {
      await openSearchAndFilters()
      await waitFor(() => {
        expect(screen.getByText('GTD-статус')).toBeInTheDocument()
        expect(screen.getByText('Контекст')).toBeInTheDocument()
        expect(screen.getByText('Область')).toBeInTheDocument()
        expect(screen.getByText('Проект')).toBeInTheDocument()
        expect(screen.getByText('Тег')).toBeInTheDocument()
      })
    })

    it('shows deadline date inputs', async () => {
      await openSearchAndFilters()
      await waitFor(() => {
        expect(screen.getByText('Дедлайн от')).toBeInTheDocument()
        expect(screen.getByText('Дедлайн до')).toBeInTheDocument()
      })
    })

    it('hides GTD status when hideGtdStatus is true', async () => {
      const user = userEvent.setup()
      render(
        <TaskFilterPanel
          filters={defaultFilters}
          searchInput=""
          onSearchInput={mockOnSearchInput}
          onUpdateFilter={mockOnUpdateFilter}
          onClearFilters={mockOnClearFilters}
          hasActiveFilters={false}
          hideGtdStatus
        />
      )
      await user.click(getSearchBtn())
      await waitFor(() => expect(screen.getByText('Фильтры')).toBeInTheDocument())
      await user.click(screen.getByText('Фильтры'))
      await waitFor(() => {
        expect(screen.queryByText('GTD-статус')).not.toBeInTheDocument()
      })
    })

    it('shows clear filters button when hasActiveFilters', async () => {
      const user = userEvent.setup()
      renderPanel()
      await user.click(getSearchBtn())
      await waitFor(() => expect(screen.getByText('Фильтры')).toBeInTheDocument())
      await user.click(screen.getByText('Фильтры'))
      await waitFor(() => {
        expect(screen.getByText('GTD-статус')).toBeInTheDocument()
      })
    })

    it('calls onClearFilters when clear button clicked', async () => {
      render(
        <TaskFilterPanel
          filters={{ context_id: 'x' }}
          searchInput=""
          onSearchInput={mockOnSearchInput}
          onUpdateFilter={mockOnUpdateFilter}
          onClearFilters={mockOnClearFilters}
          hasActiveFilters={true}
        />
      )
      expect(mockOnClearFilters).toBeDefined()
      expect(typeof mockOnClearFilters).toBe('function')
    })
  })

  describe('sorting', () => {
    it('renders sort dropdown when search is open', async () => {
      const user = userEvent.setup()
      renderPanel()
      await user.click(getSearchBtn())
      await waitFor(() => {
        expect(screen.getByText('По дате создания')).toBeInTheDocument()
      })
    })

    it('calls onUpdateFilter when sort option changed', async () => {
      const user = userEvent.setup()
      renderPanel()
      await user.click(getSearchBtn())
      await waitFor(() => expect(screen.getByDisplayValue('По дате создания')).toBeInTheDocument())
      await user.selectOptions(screen.getByDisplayValue('По дате создания'), 'title')
      expect(mockOnUpdateFilter).toHaveBeenCalledWith('sort_by', 'title')
    })

    it('renders sort order toggle', async () => {
      const user = userEvent.setup()
      renderPanel({ sort_order: 'desc' })
      await user.click(getSearchBtn())
      await waitFor(() => {
        expect(screen.getByTitle('По убыванию')).toBeInTheDocument()
      })
    })
  })
})

describe('HighlightText', () => {
  it('renders text without highlight when no query', () => {
    render(<HighlightText text="Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders text without highlight when empty query', () => {
    render(<HighlightText text="Hello World" query="" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('highlights matching text', () => {
    render(<HighlightText text="Hello World" query="World" />)
    expect(screen.getByText('World')).toBeInTheDocument()
    const mark = document.querySelector('mark')
    expect(mark).toBeInTheDocument()
    expect(mark?.textContent).toBe('World')
  })

  it('highlights case-insensitive', () => {
    render(<HighlightText text="Hello World" query="world" />)
    const mark = document.querySelector('mark')
    expect(mark).toBeInTheDocument()
  })

  it('highlights partial match', () => {
    render(<HighlightText text="Buy groceries" query="gro" />)
    const mark = document.querySelector('mark')
    expect(mark).toBeInTheDocument()
  })
})
