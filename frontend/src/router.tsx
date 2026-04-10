import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { Tasks } from './routes/Tasks'
import { Profile } from './routes/Profile'
import { Settings } from './routes/Settings'
import { Contexts } from './routes/Contexts'
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
        element: <Tasks />,
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
