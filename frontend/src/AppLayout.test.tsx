import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'

vi.mock('./hooks/useGtdCounts', () => ({
  useGtdCounts: vi.fn(),
}))

vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./components/InstallPrompt', () => ({
  InstallPrompt: () => null,
}))

import { useGtdCounts } from './hooks/useGtdCounts'
import { useAuthStore } from './stores/authStore'

function renderWithRouter(initialPath = '/inbox') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route path="inbox" element={<div>Inbox Page</div>} />
          <Route path="today" element={<div>Today Page</div>} />
          <Route path="tomorrow" element={<div>Tomorrow Page</div>} />
          <Route path="next" element={<div>Next Page</div>} />
          <Route path="waiting" element={<div>Waiting Page</div>} />
          <Route path="someday" element={<div>Someday Page</div>} />
          <Route path="completed" element={<div>Completed Page</div>} />
          <Route path="trash" element={<div>Trash Page</div>} />
          <Route path="projects" element={<div>Projects Page</div>} />
          <Route path="contexts" element={<div>Contexts Page</div>} />
          <Route path="areas" element={<div>Areas Page</div>} />
          <Route path="tags" element={<div>Tags Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('AppLayout / Sidebar', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGtdCounts).mockReturnValue({
      counts: { inbox: 3, next: 1, waiting: 0, someday: 2, completed: 5, trash: 0, today: 7, tomorrow: 4 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', username: 'testuser', email: 'test@test.com', is_admin: false, is_active: true },
      logout: mockLogout,
    } as ReturnType<typeof useAuthStore>)
  })

  describe('GTD sections', () => {
    it('renders GTD section header', () => {
      renderWithRouter()
      expect(screen.getByText('GTD')).toBeInTheDocument()
    })

    it('renders all GTD navigation items', () => {
      renderWithRouter()
      expect(screen.getByText('Входящие')).toBeInTheDocument()
      expect(screen.getByText('Сегодня')).toBeInTheDocument()
      expect(screen.getByText('Завтра')).toBeInTheDocument()
      expect(screen.getByText('Следующие действия')).toBeInTheDocument()
      expect(screen.getByText('Ожидание')).toBeInTheDocument()
      expect(screen.getByText('Когда-нибудь')).toBeInTheDocument()
    })

    it('renders management section header', () => {
      renderWithRouter()
      expect(screen.getByText('Управление')).toBeInTheDocument()
    })

    it('renders management navigation items', () => {
      renderWithRouter()
      expect(screen.getByText('Проекты')).toBeInTheDocument()
      expect(screen.getByText('Контексты')).toBeInTheDocument()
      expect(screen.getByText('Области')).toBeInTheDocument()
      expect(screen.getByText('Теги')).toBeInTheDocument()
    })

    it('renders Completed and Trash links', () => {
      renderWithRouter()
      expect(screen.getByText('Завершённые')).toBeInTheDocument()
      expect(screen.getByText('Корзина')).toBeInTheDocument()
    })
  })

  describe('counters / badges', () => {
    it('shows inbox count badge', () => {
      renderWithRouter()
      const inboxLink = screen.getByText('Входящие').closest('a')
      expect(inboxLink).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows next count badge', () => {
      renderWithRouter()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('shows someday count badge', () => {
      renderWithRouter()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('shows completed count badge', () => {
      renderWithRouter()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('does not show badge when count is 0', () => {
      renderWithRouter()
      const waitingLink = screen.getByText('Ожидание').closest('a')
      expect(waitingLink?.textContent).not.toMatch(/\d/)
    })
  })

  describe('navigation', () => {
    it('renders user section', () => {
      renderWithRouter()
      expect(screen.getAllByText('testuser').length).toBeGreaterThan(0)
    })

    it('renders Settings link', () => {
      renderWithRouter()
      expect(screen.getByText('Настройки')).toBeInTheDocument()
    })

    it('renders Logout button', () => {
      renderWithRouter()
      expect(screen.getByText('Выйти')).toBeInTheDocument()
    })

    it('calls logout on click', async () => {
      const user = userEvent.setup()
      renderWithRouter()
      await user.click(screen.getByText('Выйти'))
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe('unauthenticated state', () => {
    it('renders without sidebar when not authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: vi.fn(),
      } as ReturnType<typeof useAuthStore>)
      renderWithRouter('/login')
      expect(screen.queryByText('GTD')).not.toBeInTheDocument()
    })
  })
})
