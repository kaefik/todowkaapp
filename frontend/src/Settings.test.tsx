import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from './routes/Settings'
import type { User } from './api/users'

vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./api/users', () => ({
  usersApi: {
    getAll: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}))

import { useAuthStore } from './stores/authStore'
import { usersApi } from './api/users'

const mockUser: User = {
  id: '1',
  username: 'admin',
  email: 'admin@example.com',
  is_active: true,
  is_admin: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockRegularUser: User = {
  id: '2',
  username: 'regular',
  email: 'regular@example.com',
  is_active: true,
  is_admin: false,
  created_at: '2024-01-02T00:00:00Z',
}

const mockUsers: User[] = [mockUser, mockRegularUser]

describe('Settings', () => {
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
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers)
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  const renderSettings = () => {
    return render(<Settings />)
  }

  describe('rendering', () => {
    it('renders settings page with title', () => {
      renderSettings()

      expect(screen.getByText('Настройки')).toBeInTheDocument()
      expect(screen.getByText('Персонализируйте приложение под себя')).toBeInTheDocument()
    })

    it('renders tabs', () => {
      renderSettings()

      expect(screen.getByRole('button', { name: 'Общие' })).toBeInTheDocument()
    })

    it('renders users tab only for admin', () => {
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

      renderSettings()

      expect(screen.getByRole('button', { name: 'Пользователи' })).toBeInTheDocument()
    })

    it('does not render users tab for non-admin', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: mockRegularUser,
        accessToken: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderSettings()

      expect(screen.queryByRole('button', { name: 'Пользователи' })).not.toBeInTheDocument()
    })
  })

  describe('tab switching', () => {
    it('shows general tab content by default', () => {
      renderSettings()

      expect(screen.getByText('Внешний вид')).toBeInTheDocument()
      expect(screen.getByText('О приложении')).toBeInTheDocument()
    })

    it('switches to users tab when clicked', async () => {
      const user = userEvent.setup()
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      expect(screen.getByText('Управление пользователями')).toBeInTheDocument()
    })

    it('highlights active tab', () => {
      renderSettings()

      const generalTab = screen.getByRole('button', { name: 'Общие' })
      expect(generalTab).toHaveClass('border-indigo-500')
    })
  })

  describe('theme switching', () => {
    it('renders theme options', () => {
      renderSettings()

      expect(screen.getByText('Тема оформления')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Светлая/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Тёмная/i })).toBeInTheDocument()
    })

    it('selects light theme by default', () => {
      renderSettings()

      const lightButton = screen.getByRole('button', { name: /Светлая/i })
      expect(lightButton).toHaveClass('border-indigo-500')
    })

    it('switches to dark theme when dark button is clicked', async () => {
      const user = userEvent.setup()
      renderSettings()

      const darkButton = screen.getByRole('button', { name: /Тёмная/i })
      await user.click(darkButton)

      expect(darkButton).toHaveClass('border-indigo-500')
      expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
    })

    it('loads theme from localStorage', () => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => 'dark'),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })
      renderSettings()

      const darkButton = screen.getByRole('button', { name: /Тёмная/i })
      expect(darkButton).toHaveClass('border-indigo-500')
    })

    it('uses system preference when no theme in localStorage', () => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
      renderSettings()

      const darkButton = screen.getByRole('button', { name: /Тёмная/i })
      expect(darkButton).toHaveClass('border-indigo-500')
    })
  })

  describe('about section', () => {
    it('renders version information', () => {
      renderSettings()

      expect(screen.getByText('Версия:')).toBeInTheDocument()
      expect(screen.getByText('1.0.0')).toBeInTheDocument()
    })

    it('renders app name', () => {
      renderSettings()

      expect(screen.getByText('Название:')).toBeInTheDocument()
      expect(screen.getByText('Todowka')).toBeInTheDocument()
    })

    it('renders description', () => {
      renderSettings()

      expect(screen.getByText('Приложение для управления задачами с поддержкой PWA')).toBeInTheDocument()
    })
  })

  describe('users tab', () => {
    it('fetches users on mount', async () => {
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(usersApi.getAll).toHaveBeenCalled()
    })

    it('shows loading state while fetching', async () => {
      vi.mocked(usersApi.getAll).mockImplementation(() => new Promise(() => {}))
      renderSettings()

      const user = userEvent.setup()
      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).toBeInTheDocument()
      })
    })

    it('shows users list after fetching', async () => {
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(screen.getByText('Управление пользователями')).toBeInTheDocument()
      expect(screen.getByText('Всего: 2')).toBeInTheDocument()
    })

    it('shows empty state when no users', async () => {
      vi.mocked(usersApi.getAll).mockResolvedValue([])
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(screen.getByText('Нет пользователей')).toBeInTheDocument()
    })

    it('shows error when fetch fails', async () => {
      vi.mocked(usersApi.getAll).mockRejectedValue(new Error('Failed to fetch'))
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
    })
  })

  describe('user actions', () => {
    it('does not show actions for current user', async () => {
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      const adminRow = screen.getByText('admin').closest('tr')
      if (adminRow) {
        expect(adminRow).not.toContainHTML('Блокировать')
        expect(adminRow).not.toContainHTML('Удалить')
      }
    })

    it('does not show actions for admin users', async () => {
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      const adminRow = screen.getByText('admin').closest('tr')
      if (adminRow) {
        expect(adminRow).not.toContainHTML('Блокировать')
        expect(adminRow).not.toContainHTML('Удалить')
      }
    })

    it('shows block button for active regular user', async () => {
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(screen.getByRole('button', { name: 'Блокировать' })).toBeInTheDocument()
    })

    it('shows unblock button for blocked user', async () => {
      const blockedUser: User = {
        ...mockRegularUser,
        is_active: false,
      }
      vi.mocked(usersApi.getAll).mockResolvedValue([mockUser, blockedUser])
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(screen.getByRole('button', { name: 'Разблокировать' })).toBeInTheDocument()
    })

    it('calls blockUser when block button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(usersApi.blockUser).mockResolvedValue(undefined)
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      const blockButton = screen.getByRole('button', { name: 'Блокировать' })
      await user.click(blockButton)

      expect(usersApi.blockUser).toHaveBeenCalledWith('2')
    })

    it('calls unblockUser when unblock button is clicked', async () => {
      const user = userEvent.setup()
      const blockedUser: User = {
        ...mockRegularUser,
        is_active: false,
      }
      vi.mocked(usersApi.getAll).mockResolvedValue([mockUser, blockedUser])
      vi.mocked(usersApi.unblockUser).mockResolvedValue(undefined)
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      const unblockButton = screen.getByRole('button', { name: 'Разблокировать' })
      await user.click(unblockButton)

      expect(usersApi.unblockUser).toHaveBeenCalledWith('2')
    })

    it('shows confirm dialog before deleting user', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      vi.mocked(usersApi.deleteUser).mockResolvedValue(undefined)
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      const deleteButton = screen.getByRole('button', { name: 'Удалить' })
      await user.click(deleteButton)

      expect(confirmSpy).toHaveBeenCalledWith('Вы уверены, что хотите удалить этого пользователя?')
      expect(usersApi.deleteUser).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('calls deleteUser when confirm is accepted', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      vi.mocked(usersApi.deleteUser).mockResolvedValue(undefined)
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      const deleteButton = screen.getByRole('button', { name: 'Удалить' })
      await user.click(deleteButton)

      expect(usersApi.deleteUser).toHaveBeenCalledWith('2')
    })
  })

  describe('user display', () => {
    it('shows username with first letter avatar', async () => {
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('shows "Вы" label for current user', async () => {
      renderSettings()

      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await userEvent.setup().click(usersTab)

      expect(screen.getByText('(Вы)')).toBeInTheDocument()
    })

    it('shows active status badge for active users', async () => {
      renderSettings()

      const user = userEvent.setup()
      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      expect(screen.getAllByText('Активен')).toHaveLength(2)
    })

    it('shows blocked status badge for blocked users', async () => {
      const blockedUser: User = {
        ...mockRegularUser,
        is_active: false,
      }
      vi.mocked(usersApi.getAll).mockResolvedValue([mockUser, blockedUser])
      renderSettings()

      const user = userEvent.setup()
      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      expect(screen.getByText('Заблокирован')).toBeInTheDocument()
    })

    it('shows admin role badge for admin users', async () => {
      renderSettings()

      const user = userEvent.setup()
      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      expect(screen.getByText('Администратор')).toBeInTheDocument()
    })

    it('shows user role badge for regular users', async () => {
      renderSettings()

      const user = userEvent.setup()
      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      const badges = screen.getAllByText('Пользователь')
      expect(badges.length).toBeGreaterThan(0)
      expect(badges.some(badge => badge.tagName === 'SPAN')).toBe(true)
    })

    it('shows registration date', async () => {
      renderSettings()

      const user = userEvent.setup()
      const usersTab = screen.getByRole('button', { name: 'Пользователи' })
      await user.click(usersTab)

      expect(screen.getByText('01.01.2024')).toBeInTheDocument()
    })
  })
})
