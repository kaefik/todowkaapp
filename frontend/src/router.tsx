import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { Tasks } from './routes/Tasks'
import { Inbox } from './routes/Inbox'
import { Active } from './routes/Active'
import { Today } from './routes/Today'
import { Tomorrow } from './routes/Tomorrow'
import { NextActions } from './routes/NextActions'
import { WaitingFor } from './routes/WaitingFor'
import { Someday } from './routes/Someday'
import { Completed } from './routes/Completed'
import { Trash } from './routes/Trash'
import { Profile } from './routes/Profile'
import { Settings } from './routes/Settings'
import { Contexts } from './routes/Contexts'
import { Areas } from './routes/Areas'
import { Tags } from './routes/Tags'
import { Projects } from './routes/Projects'
import { ProjectDetail } from './routes/ProjectDetail'
import { AreaDetail } from './routes/AreaDetail'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { Notifications } from './routes/Notifications'
import { Onboarding } from './routes/Onboarding'

const VALID_SECTIONS = new Set([
  'inbox', 'active', 'today', 'tomorrow', 'next', 'waiting', 'someday',
  'completed', 'trash', 'projects', 'contexts', 'areas', 'tags',
])

function DefaultSectionRedirect() {
  const saved = localStorage.getItem('default-section')
  const section = saved && VALID_SECTIONS.has(saved) ? saved : 'inbox'
  return <Navigate to={`/${section}`} replace />
}

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/onboarding',
    element: <Onboarding />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DefaultSectionRedirect />,
      },
      {
        path: 'tasks',
        element: <Tasks />,
      },
      {
        path: 'inbox',
        element: <Inbox />,
      },
      {
        path: 'active',
        element: <Active />,
      },
      {
        path: 'today',
        element: <Today />,
      },
      {
        path: 'tomorrow',
        element: <Tomorrow />,
      },
      {
        path: 'next',
        element: <NextActions />,
      },
      {
        path: 'waiting',
        element: <WaitingFor />,
      },
      {
        path: 'someday',
        element: <Someday />,
      },
      {
        path: 'completed',
        element: <Completed />,
      },
      {
        path: 'trash',
        element: <Trash />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'contexts',
        element: <Contexts />,
      },
      {
        path: 'areas',
        element: <Areas />,
      },
      {
        path: 'areas/:id',
        element: <AreaDetail />,
      },
      {
        path: 'tags',
        element: <Tags />,
      },
      {
        path: 'projects',
        element: <Projects />,
      },
      {
        path: 'notifications',
        element: <Notifications />,
      },
      {
        path: 'projects/:id',
        element: <ProjectDetail />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]

const router = createBrowserRouter(routes)

export function AppRouter() {
  return <RouterProvider router={router} />
}
