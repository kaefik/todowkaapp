import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Login } from './routes/Login'

vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./hooks/useConfig', () => ({
  useConfig: vi.fn(),
}))

import { useAuthStore } from './stores/authStore'
import { useConfig } from './hooks/useConfig'

const mockedNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

describe('Login', () => {
  const mockLogin = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      clearError: mockClearError,
      isLoading: false,
      error: null,
      user: null,
      accessToken: null,
      isAuthenticated: false,
      register: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    })
    vi.mocked(useConfig).mockReturnValue({
      config: {
        registration_available: true,
        invite_code_required: false,
        max_users: null,
        current_users: 0,
      },
      isLoading: false,
    })
  })

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
  }

  describe('rendering', () => {
    it('renders login form with title', () => {
      renderLogin()

      expect(screen.getByText('Todowka')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    })

    it('renders username and password fields', () => {
      renderLogin()

      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('renders sign in button', () => {
      renderLogin()

      const button = screen.getByRole('button', { name: /sign in/i })
      expect(button).toBeInTheDocument()
    })

    it('renders link to register page', () => {
      renderLogin()

      const link = screen.getByRole('link', { name: /sign up/i })
      expect(link).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('shows validation error when username is empty', async () => {
      const user = userEvent.setup()
      renderLogin()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'password123')

      const button = screen.getByRole('button', { name: /sign in/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument()
      })
    })

    it('shows validation error when password is empty', async () => {
      const user = userEvent.setup()
      renderLogin()

      const usernameInput = screen.getByLabelText('Username')
      await user.type(usernameInput, 'testuser')

      const button = screen.getByRole('button', { name: /sign in/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument()
      })
    })

    it('shows both validation errors when both fields are empty', async () => {
      const user = userEvent.setup()
      renderLogin()

      const button = screen.getByRole('button', { name: /sign in/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument()
        expect(screen.getByText('Password is required')).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('calls authStore.login with correct credentials', async () => {
      const user = userEvent.setup()
      renderLogin()

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const button = screen.getByRole('button', { name: /sign in/i })

      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'password123')
      await user.click(button)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'password123',
        })
      })
    })

    it('shows loading state while logging in', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        isLoading: true,
        error: null,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderLogin()

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument()
      })
    })

    it('shows error message when login fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid credentials'
      mockLogin.mockRejectedValue(new Error(errorMessage))

      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        isLoading: false,
        error: errorMessage,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderLogin()

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const button = screen.getByRole('button', { name: /sign in/i })

      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'password123')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('clears error before submitting', async () => {
      const user = userEvent.setup()
      renderLogin()

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const button = screen.getByRole('button', { name: /sign in/i })

      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'password123')
      await user.click(button)

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled()
      })
    })
  })

  describe('redirects', () => {
    it('redirects to /tasks on successful login', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValueOnce(undefined)

      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        isLoading: false,
        error: null,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderLogin()

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const button = screen.getByRole('button', { name: /sign in/i })

      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'password123')
      await user.click(button)

      await waitFor(() => {
        expect(mockedNavigate).toHaveBeenCalledWith('/tasks')
      })
    })
  })
})
