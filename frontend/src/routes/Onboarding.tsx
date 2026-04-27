import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { OnboardingWizard } from '../components/OnboardingWizard'

export function Onboarding() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (localStorage.getItem('onboarding-complete')) {
    return <Navigate to="/" replace />
  }

  return <OnboardingWizard />
}
