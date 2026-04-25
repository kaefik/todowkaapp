import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { AppRouter } from './router'
import { AuthInitializer } from './components/AuthInitializer'
import { NotificationProvider } from './components/NotificationProvider'
import { SyncProvider } from './components/SyncProvider'
import { ToastContainer } from './components/ToastContainer'
import { UpdateNotification } from './components/UpdateNotification'
import { OfflineBanner } from './components/OfflineBanner'
import { migrateOldData } from './db/migration'

migrateOldData().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OfflineBanner />
    <UpdateNotification />
    <AuthInitializer>
      <SyncProvider>
        <NotificationProvider>
          <AppRouter />
          <ToastContainer />
        </NotificationProvider>
      </SyncProvider>
    </AuthInitializer>
  </StrictMode>,
)
