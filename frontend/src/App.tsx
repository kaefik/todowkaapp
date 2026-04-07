import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { Tasks } from './routes/Tasks'
import { useAuthStore } from './stores/authStore'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/tasks" replace /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/tasks" replace /> : <Register />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/tasks" : "/login"} replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App