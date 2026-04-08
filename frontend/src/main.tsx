import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouter } from './router'
import { AuthInitializer } from './components/AuthInitializer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthInitializer>
      <AppRouter />
    </AuthInitializer>
  </StrictMode>,
)
