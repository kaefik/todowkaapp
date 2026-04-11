import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { Tasks } from './routes/Tasks'
import { Inbox } from './routes/Inbox'
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
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'

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
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/inbox" replace />,
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
        path: 'tags',
        element: <Tags />,
      },
      {
        path: 'projects',
        element: <Projects />,
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
