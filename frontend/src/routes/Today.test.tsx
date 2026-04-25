import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DueDateTaskList } from './DueDateTaskList'
import { getDayBounds } from '../hooks/useDueDateTasks'

vi.mock('../hooks/useDueDateTasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useDueDateTasks')>()
  return {
    ...actual,
    useDueDateTasks: vi.fn(),
  }
})

vi.mock('../hooks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('../hooks/useContexts', () => ({
  useContexts: vi.fn(() => ({ contexts: [], isLoading: false, error: null, addContext: vi.fn(), updateContext: vi.fn(), deleteContext: vi.fn(), refetch: vi.fn() })),
}))

vi.mock('../hooks/useAreas', () => ({
  useAreas: vi.fn(() => ({ areas: [], isLoading: false, error: null, addArea: vi.fn(), updateArea: vi.fn(), deleteArea: vi.fn(), refetch: vi.fn() })),
}))

vi.mock('../hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({ projects: [], isLoading: false, error: null, addProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(), refetch: vi.fn() })),
}))

vi.mock('../hooks/useTags', () => ({
  useTags: vi.fn(() => ({ tags: [], isLoading: false, error: null, addTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn(), refetch: vi.fn() })),
}))

vi.mock('../db/hooks', () => ({
  useOnlineStatus: vi.fn().mockReturnValue(true),
  useDexieQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useDueDateTasks } from '../hooks/useDueDateTasks'
import { useTasks } from '../hooks/useTasks'
import { useAuthStore } from '../stores/authStore'

describe('DueDateTaskList — integration', () => {
  const mockAddTask = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDueDateTasks).mockReturnValue({
      tasks: [],
      isLoading: false,
      count: 0,
    })
    vi.mocked(useTasks).mockReturnValue({
      tasks: [],
      isLoading: false,
      error: null,
      addTask: mockAddTask,
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      moveTask: vi.fn(),
      deleteTask: vi.fn(),
      refetch: vi.fn(),
      fetchTask: vi.fn(),
    })
    vi.mocked(useAuthStore).mockImplementation((selector?: (s: { user: { id: string; timezone: string } }) => unknown) => {
      const state = { user: { id: 'user1', timezone: 'UTC' } }
      return selector ? selector(state) : state
    })
  })

  it('calls addTask with due_date from getDayBounds and gtd_status=active', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DueDateTaskList dayOffset={0} title="Сегодня" emptyMessage="Нет задач на сегодня." />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('Добавьте задачу...'), 'Test task')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledTimes(1)
    })

    const callArgs = mockAddTask.mock.calls[0][0]
    expect(callArgs.title).toBe('Test task')
    expect(callArgs.gtd_status).toBe('active')
    expect(callArgs.due_date).toBe(getDayBounds('UTC', 0).end)
  })

  it('uses user.timezone from authStore', async () => {
    vi.mocked(useAuthStore).mockImplementation((selector?: (s: { user: { id: string; timezone: string } }) => unknown) => {
      const state = { user: { id: 'user1', timezone: 'America/New_York' } }
      return selector ? selector(state) : state
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DueDateTaskList dayOffset={0} title="Сегодня" emptyMessage="Нет задач на сегодня." />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('Добавьте задачу...'), 'NY task')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledTimes(1)
    })

    const callArgs = mockAddTask.mock.calls[0][0]
    expect(callArgs.due_date).toBe(getDayBounds('America/New_York', 0).end)
  })

  it('dayOffset=1 uses getDayBounds with dayOffset=1', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DueDateTaskList dayOffset={1} title="Завтра" emptyMessage="Нет задач на завтра." />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('Добавьте задачу...'), 'Tomorrow task')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledTimes(1)
    })

    const callArgs = mockAddTask.mock.calls[0][0]
    expect(callArgs.due_date).toBe(getDayBounds('UTC', 1).end)
  })
})

describe('getDayBounds — UTC timezone correctness', () => {
  it('returns correct start and end for UTC today', () => {
    const { start, end } = getDayBounds('UTC', 0)
    const startObj = new Date(start)
    const endObj = new Date(end)

    expect(startObj.getUTCHours()).toBe(0)
    expect(startObj.getUTCMinutes()).toBe(0)
    expect(startObj.getUTCSeconds()).toBe(0)

    expect(endObj.getUTCHours()).toBe(23)
    expect(endObj.getUTCMinutes()).toBe(59)
    expect(endObj.getUTCSeconds()).toBe(59)
    expect(endObj.getUTCMilliseconds()).toBe(999)

    expect(startObj.getUTCDate()).toBe(endObj.getUTCDate())
  })

  it('today end is within today bounds', () => {
    const { start, end } = getDayBounds('UTC', 0)
    expect(end >= start).toBe(true)
    expect(end <= end).toBe(true)
  })

  it('today and tomorrow bounds do not overlap (UTC)', () => {
    const today = getDayBounds('UTC', 0)
    const tomorrow = getDayBounds('UTC', 1)
    expect(today.end < tomorrow.start).toBe(true)
  })
})

describe('getDayBounds — non-UTC timezone correctness', () => {
  it('NY timezone: start is midnight EDT', () => {
    const { start } = getDayBounds('America/New_York', 0)
    const startObj = new Date(start)
    expect(startObj.getUTCHours()).toBe(4)
    expect(startObj.getUTCMinutes()).toBe(0)
  })

  it('Yekaterinburg timezone: start is midnight YEKT', () => {
    const { start } = getDayBounds('Asia/Yekaterinburg', 0)
    const startObj = new Date(start)
    expect(startObj.getUTCHours()).toBe(19)
    expect(startObj.getUTCMinutes()).toBe(0)
  })

  it('today and tomorrow bounds do not overlap (NY)', () => {
    const today = getDayBounds('America/New_York', 0)
    const tomorrow = getDayBounds('America/New_York', 1)
    expect(today.end < tomorrow.start).toBe(true)
  })

  it('today and tomorrow bounds do not overlap (Yekaterinburg)', () => {
    const today = getDayBounds('Asia/Yekaterinburg', 0)
    const tomorrow = getDayBounds('Asia/Yekaterinburg', 1)
    expect(today.end < tomorrow.start).toBe(true)
  })
})

describe('getDayBounds — with fake timers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('late night UTC: still returns correct day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-25T23:30:00Z'))

    const { start, end } = getDayBounds('UTC', 0)
    expect(start).toContain('2026-04-25T00:00:00')
    expect(end).toContain('2026-04-25T23:59:59')
  })

  it('midnight UTC: returns new day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T00:00:00Z'))

    const { start, end } = getDayBounds('UTC', 0)
    expect(start).toContain('2026-04-26T00:00:00')
    expect(end).toContain('2026-04-26T23:59:59')
  })

  it('dayOffset=1 with fake timers', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'))

    const { start, end } = getDayBounds('UTC', 1)
    expect(start).toContain('2026-04-26T00:00:00')
    expect(end).toContain('2026-04-26T23:59:59')
  })

  it('late night in browser but different day in user timezone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-25T23:30:00Z'))

    const utcBounds = getDayBounds('UTC', 0)
    const nyBounds = getDayBounds('America/New_York', 0)

    const utcStart = new Date(utcBounds.start)
    const nyStart = new Date(nyBounds.start)

    expect(utcStart.getUTCDate()).toBe(25)
    expect(nyStart.getUTCDate()).toBe(25)
    expect(nyStart.getUTCHours()).toBe(4)
  })
})
