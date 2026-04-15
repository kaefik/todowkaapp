import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouter } from './router'
import { AuthInitializer } from './components/AuthInitializer'
import { NotificationProvider } from './components/NotificationProvider'
import { ToastContainer } from './components/ToastContainer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthInitializer>
      <NotificationProvider>
        <AppRouter />
        <ToastContainer />
      </NotificationProvider>
    </AuthInitializer>
  </StrictMode>,
)
