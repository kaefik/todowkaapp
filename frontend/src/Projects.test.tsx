import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Projects } from './routes/Projects'

vi.mock('./hooks/useProjects', () => ({
  useProjects: vi.fn(),
}))

import { useProjects } from './hooks/useProjects'
import type { Project } from './hooks/useProjects'

const mockProject: Project = {
  id: 'p1',
  name: 'Project Alpha',
  description: 'Test project',
  color: '#FF0000',
  area_id: null,
  is_active: true,
  progress: { tasks_total: 5, tasks_completed: 2, progress_percent: 40 },
  user_id: 'u1',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

describe('Projects page', () => {
  const mockAddProject = vi.fn()
  const mockUpdateProject = vi.fn()
  const mockDeleteProject = vi.fn()
  const mockRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useProjects).mockReturnValue({
      projects: [mockProject],
      isLoading: false,
      error: null,
      addProject: mockAddProject,
      updateProject: mockUpdateProject,
      deleteProject: mockDeleteProject,
      refetch: mockRefetch,
    })
  })

  const renderProjects = () => {
    return render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    )
  }

  describe('rendering', () => {
    it('renders page title', () => {
      renderProjects()
      expect(screen.getByText('Проекты')).toBeInTheDocument()
    })

    it('renders new project button', () => {
      renderProjects()
      expect(screen.getByText('+ Новый проект')).toBeInTheDocument()
    })

    it('renders project card', () => {
      renderProjects()
      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    })

    it('renders project description', () => {
      renderProjects()
      expect(screen.getByText('Test project')).toBeInTheDocument()
    })

    it('renders empty state when no projects', () => {
      vi.mocked(useProjects).mockReturnValue({
        ...vi.mocked(useProjects)(),
        projects: [],
      })
      renderProjects()
      expect(screen.getByText('Нет проектов.')).toBeInTheDocument()
    })
  })

  describe('progress bar', () => {
    it('renders progress percentage', () => {
      renderProjects()
      expect(screen.getByText('40%')).toBeInTheDocument()
    })

    it('renders tasks completed/total count', () => {
      renderProjects()
      expect(screen.getByText('2 / 5 задач')).toBeInTheDocument()
    })

    it('renders progress bar element', () => {
      renderProjects()
      const progressBar = screen.getByText('40%').closest('.space-y-1')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('project CRUD', () => {
    it('shows create form on new project click', async () => {
      const user = userEvent.setup()
      renderProjects()
      await user.click(screen.getByText('+ Новый проект'))
      expect(screen.getByPlaceholderText('Название проекта')).toBeInTheDocument()
    })

    it('hides new project button when creating', async () => {
      const user = userEvent.setup()
      renderProjects()
      await user.click(screen.getByText('+ Новый проект'))
      expect(screen.queryByText('+ Новый проект')).not.toBeInTheDocument()
    })

    it('cancels create form', async () => {
      const user = userEvent.setup()
      renderProjects()
      await user.click(screen.getByText('+ Новый проект'))
      await user.click(screen.getByText('Отмена'))
      expect(screen.getByText('+ Новый проект')).toBeInTheDocument()
    })

    it('shows edit and delete buttons', () => {
      renderProjects()
      expect(screen.getByText('Ред.')).toBeInTheDocument()
      expect(screen.getByText('Удалить')).toBeInTheDocument()
    })

    it('opens edit form on edit click', async () => {
      const user = userEvent.setup()
      renderProjects()
      await user.click(screen.getByText('Ред.'))
      expect(screen.getByDisplayValue('Project Alpha')).toBeInTheDocument()
    })

    it('calls deleteProject on delete click', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const user = userEvent.setup()
      renderProjects()
      await user.click(screen.getByText('Удалить'))
      expect(mockDeleteProject).toHaveBeenCalledWith('p1')
    })
  })

  describe('error handling', () => {
    it('shows error message', () => {
      vi.mocked(useProjects).mockReturnValue({
        ...vi.mocked(useProjects)(),
        projects: [],
        error: 'Failed to load',
      })
      renderProjects()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('shows retry button on error', () => {
      vi.mocked(useProjects).mockReturnValue({
        ...vi.mocked(useProjects)(),
        projects: [],
        error: 'Failed to load',
      })
      renderProjects()
      expect(screen.getByText('Повторить')).toBeInTheDocument()
    })

    it('calls refetch on retry click', async () => {
      const user = userEvent.setup()
      vi.mocked(useProjects).mockReturnValue({
        ...vi.mocked(useProjects)(),
        projects: [],
        error: 'Failed to load',
        refetch: mockRefetch,
      })
      renderProjects()
      await user.click(screen.getByText('Повторить'))
      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('shows loading skeletons', () => {
      vi.mocked(useProjects).mockReturnValue({
        ...vi.mocked(useProjects)(),
        projects: [],
        isLoading: true,
      })
      renderProjects()
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('archived project', () => {
    it('shows archive label for inactive project', () => {
      vi.mocked(useProjects).mockReturnValue({
        ...vi.mocked(useProjects)(),
        projects: [{ ...mockProject, is_active: false }],
      })
      renderProjects()
      expect(screen.getByText('(архив)')).toBeInTheDocument()
    })
  })
})
