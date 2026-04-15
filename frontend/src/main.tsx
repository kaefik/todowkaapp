import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouter } from './router'
import { AuthInitializer } from './components/AuthInitializer'
import { NotificationProvider } from './components/NotificationProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthInitializer>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </AuthInitializer>
  </StrictMode>,
)
