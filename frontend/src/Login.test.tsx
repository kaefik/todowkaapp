import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Login } from './Login'

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '../stores/authStore'

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
      expect(link).toHaveAttribute('href', '/register')
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
      const user = userEvent.setup()
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

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const button = screen.getByRole('button', { name: /sign in/i })

      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'password123')
      await user.click(button)

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
      const mockedNavigate = vi.fn()
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom')
        return {
          ...actual as object,
          useNavigate: () => mockedNavigate,
        }
      })

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
