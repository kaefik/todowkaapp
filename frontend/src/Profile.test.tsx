import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Profile } from './routes/Profile'
import type { Stats } from './routes/Profile'

vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
  },
}))

import { useAuthStore } from './stores/authStore'
import { httpClient } from './api/httpClient'

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  is_admin: false,
  created_at: '2024-01-01T00:00:00Z',
}

const mockStats: Stats = {
  total: 10,
  active: 5,
  completed: 5,
  created_week: 3,
  created_month: 7,
  completed_week: 2,
  completed_month: 4,
}

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      accessToken: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    })
    vi.mocked(httpClient.get).mockResolvedValue({
      data: mockStats,
      status: 200,
      statusText: 'OK',
    })
  })

  const renderProfile = () => {
    return render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    )
  }

  describe('rendering', () => {
    it('renders profile page with title', () => {
      renderProfile()

      expect(screen.getByText('Профиль')).toBeInTheDocument()
      expect(screen.getByText('Информация о вашем аккаунте и статистика')).toBeInTheDocument()
    })

    it('renders link to settings', () => {
      renderProfile()

      const settingsLink = screen.getByRole('link', { name: 'Настройки' })
      expect(settingsLink).toBeInTheDocument()
      expect(settingsLink).toHaveAttribute('href', '/settings')
    })

    it('renders user information section', () => {
      renderProfile()

      expect(screen.getByText('Информация о пользователе')).toBeInTheDocument()
    })

    it('renders username field', () => {
      renderProfile()

      expect(screen.getByText('Имя пользователя')).toBeInTheDocument()
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('renders email field', () => {
      renderProfile()

      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('renders status field for active user', () => {
      renderProfile()

      expect(screen.getByText('Статус')).toBeInTheDocument()
      expect(screen.getByText('Активен')).toBeInTheDocument()
    })

    it('renders status field for inactive user', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { ...mockUser, is_active: false },
        accessToken: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderProfile()

      expect(screen.getByText('Неактивен')).toBeInTheDocument()
    })

    it('renders registration date', () => {
      renderProfile()

      expect(screen.getByText('Дата регистрации')).toBeInTheDocument()
      expect(screen.getByText(/января 2024/)).toBeInTheDocument()
    })

    it('renders days since creation', () => {
      renderProfile()

      expect(screen.getByText('Вы с нами')).toBeInTheDocument()
      expect(screen.getByText(/дней/)).toBeInTheDocument()
    })
  })

  describe('statistics loading', () => {
    it('shows loading state while fetching stats', () => {
      vi.mocked(httpClient.get).mockImplementation(() => new Promise(() => {}))
      renderProfile()

      expect(screen.queryByText('Статистика задач')).not.toBeInTheDocument()
    })

    it('hides loading state after stats are loaded', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Статистика задач')).toBeInTheDocument()
      })
    })
  })

  describe('statistics display', () => {
    it('renders statistics section after loading', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Статистика задач')).toBeInTheDocument()
      })
    })

    it('renders total tasks stat', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Всего задач')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    it('renders active tasks stat', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Активных')).toBeInTheDocument()
        expect(screen.getAllByText('5')).toHaveLength(2)
      })
    })

    it('renders completed tasks stat', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Выполнено')).toBeInTheDocument()
        expect(screen.getAllByText('5')).toHaveLength(2)
      })
    })

    it('renders created week stat', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Создано за неделю')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('renders created month stat', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Создано за месяц')).toBeInTheDocument()
        expect(screen.getByText('7')).toBeInTheDocument()
      })
    })

    it('renders completed week stat', async () => {
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Выполнено за неделю')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('shows error message when stats fetch fails', async () => {
      vi.mocked(httpClient.get).mockRejectedValue(new Error('Network error'))
      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Failed to load statistics')).toBeInTheDocument()
      })
    })

    it('does not show statistics when error occurs', async () => {
      vi.mocked(httpClient.get).mockRejectedValue(new Error('Network error'))
      renderProfile()

      await waitFor(() => {
        expect(screen.queryByText('Статистика задач')).not.toBeInTheDocument()
      })
    })
  })

  describe('data fetching', () => {
    it('calls httpClient.get with correct endpoint on mount', async () => {
      renderProfile()

      await waitFor(() => {
        expect(httpClient.get).toHaveBeenCalledWith('/stats')
      })
    })

    it('fetches stats only once on mount', async () => {
      renderProfile()

      await waitFor(() => {
        expect(httpClient.get).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('edge cases', () => {
    it('handles null created_at date', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { ...mockUser, created_at: null },
        accessToken: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderProfile()

      expect(screen.getByText('Дата регистрации')).toBeInTheDocument()
      expect(screen.getAllByText('N/A')).toHaveLength(2)
    })

    it('handles zero stats', async () => {
      const emptyStats: Stats = {
        total: 0,
        active: 0,
        completed: 0,
        created_week: 0,
        created_month: 0,
        completed_week: 0,
        completed_month: 0,
      }

      vi.mocked(httpClient.get).mockResolvedValue({
        data: emptyStats,
        status: 200,
        statusText: 'OK',
      })

      renderProfile()

      await waitFor(() => {
        expect(screen.getByText('Всего задач')).toBeInTheDocument()
        expect(screen.getAllByText('0')).toHaveLength(6)
      })
    })
  })
})
