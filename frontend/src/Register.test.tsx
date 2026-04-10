import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Register } from './routes/Register'

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

describe('Register', () => {
  const mockRegisterAndLogin = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      registerAndLogin: mockRegisterAndLogin,
      clearError: mockClearError,
      isLoading: false,
      error: null,
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: vi.fn(),
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
    mockedNavigate.mockReset()
  })

  const renderRegister = () => {
    return render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )
  }

  describe('rendering', () => {
    it('renders register form with title', () => {
      renderRegister()

      expect(screen.getByText('Todowka')).toBeInTheDocument()
      expect(screen.getByText('Create your account')).toBeInTheDocument()
    })

    it('renders username, email, password, confirm password fields', () => {
      renderRegister()

      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    })

    it('renders sign up button', () => {
      renderRegister()

      const button = screen.getByRole('button', { name: /sign up/i })
      expect(button).toBeInTheDocument()
    })

    it('renders link to login page', () => {
      renderRegister()

      const link = screen.getByRole('link', { name: /sign in/i })
      expect(link).toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it('does not submit when username is too short', async () => {
      const user = userEvent.setup()
      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'ab')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(button)

      await waitFor(() => {
        expect(mockRegisterAndLogin).not.toHaveBeenCalled()
      })
    })

    it('does not submit when email is invalid', async () => {
      const user = userEvent.setup()
      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(button)

      await waitFor(() => {
        expect(mockRegisterAndLogin).not.toHaveBeenCalled()
      })
    })

    it('does not submit when password is too short', async () => {
      const user = userEvent.setup()
      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Short1!')
      await user.type(confirmPasswordInput, 'Short1!')
      await user.click(button)

      await waitFor(() => {
        expect(mockRegisterAndLogin).not.toHaveBeenCalled()
      })
    })

    it('does not submit when passwords do not match', async () => {
      const user = userEvent.setup()
      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password2!')
      await user.click(button)

      await waitFor(() => {
        expect(mockRegisterAndLogin).not.toHaveBeenCalled()
      })
    })

    it('submits with valid password meeting all requirements', async () => {
      const user = userEvent.setup()
      mockRegisterAndLogin.mockResolvedValueOnce(undefined)

      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(button)

      await waitFor(() => {
        expect(mockRegisterAndLogin).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password1!',
          invite_code: undefined,
        })
      })
    })
  })

  describe('invite code field', () => {
    it('does not show invite code field when not required', () => {
      renderRegister()

      expect(screen.queryByLabelText('Invite Code')).not.toBeInTheDocument()
    })

    it('shows invite code field when required', () => {
      vi.mocked(useConfig).mockReturnValue({
        config: {
          registration_available: true,
          invite_code_required: true,
          max_users: null,
          current_users: 0,
        },
        isLoading: false,
      })

      renderRegister()

      expect(screen.getByLabelText('Invite Code')).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('calls registerAndLogin with correct data', async () => {
      const user = userEvent.setup()
      mockRegisterAndLogin.mockResolvedValueOnce(undefined)

      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(button)

      await waitFor(() => {
        expect(mockRegisterAndLogin).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password1!',
          invite_code: undefined,
        })
      })
    })

    it('calls registerAndLogin with invite code when provided', async () => {
      const user = userEvent.setup()
      mockRegisterAndLogin.mockResolvedValueOnce(undefined)

      vi.mocked(useConfig).mockReturnValue({
        config: {
          registration_available: true,
          invite_code_required: true,
          max_users: null,
          current_users: 0,
        },
        isLoading: false,
      })

      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const inviteCodeInput = screen.getByLabelText('Invite Code')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.type(inviteCodeInput, 'INVITE123')
      await user.click(button)

      await waitFor(() => {
        expect(mockRegisterAndLogin).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password1!',
          invite_code: 'INVITE123',
        })
      })
    })

    it('redirects to /tasks on successful registration', async () => {
      const user = userEvent.setup()
      mockRegisterAndLogin.mockResolvedValueOnce(undefined)

      renderRegister()

      const usernameInput = screen.getByLabelText('Username')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const button = screen.getByRole('button', { name: /sign up/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(button)

      await waitFor(() => {
        expect(mockedNavigate).toHaveBeenCalledWith('/tasks')
      })
    })

    it('shows loading state while registering', async () => {
      const user = userEvent.setup()

      vi.mocked(useAuthStore).mockReturnValue({
        registerAndLogin: mockRegisterAndLogin,
        clearError: mockClearError,
        isLoading: true,
        error: null,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderRegister()

      await waitFor(() => {
        expect(screen.getByText('Creating account...')).toBeInTheDocument()
      })
    })

    it('shows error message when registration fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Registration failed'
      mockRegisterAndLogin.mockRejectedValue(new Error(errorMessage))

      vi.mocked(useAuthStore).mockReturnValue({
        registerAndLogin: mockRegisterAndLogin,
        clearError: mockClearError,
        isLoading: false,
        error: errorMessage,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      })

      renderRegister()

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })
  })

  describe('max users display', () => {
    it('shows max users info when configured', () => {
      vi.mocked(useConfig).mockReturnValue({
        config: {
          registration_available: true,
          invite_code_required: false,
          max_users: 100,
          current_users: 25,
        },
        isLoading: false,
      })

      renderRegister()

      expect(screen.getByText('Доступно мест для регистрации: 75 из 100')).toBeInTheDocument()
    })

    it('does not show max users info when not configured', () => {
      renderRegister()

      expect(screen.queryByText('Доступно мест для регистрации')).not.toBeInTheDocument()
    })
  })
})
