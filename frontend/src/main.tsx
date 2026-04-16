import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouter } from './router'
import { AuthInitializer } from './components/AuthInitializer'
import { NotificationProvider } from './components/NotificationProvider'
import { ToastContainer } from './components/ToastContainer'
import { OfflineBanner } from './components/OfflineBanner'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { setupLocalTaskDebug } from './lib/localTaskDebug'

setupLocalTaskDebug()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <AuthInitializer>
        <NotificationProvider>
          <AppRouter />
          <ToastContainer />
        </NotificationProvider>
      </AuthInitializer>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
