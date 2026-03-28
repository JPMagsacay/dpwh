import './App.css'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { useAuth } from './auth/AuthContext'
import AppLayout from './components/AppLayout'
import ProfilingList from './pages/ProfilingList'
import ProfileForm from './pages/ProfileForm'
import ProfileDetails from './pages/ProfileDetails'
import Settings from './pages/Settings'
import ArchiveProfiles from './pages/ArchiveProfiles'

function App() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  function RequireAuth({ children }) {
    if (loading) return <div className="page page--center">Loading…</div>
    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
    return children
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profiling" element={<ProfilingList />} />
        <Route path="/profiling/archive" element={<ArchiveProfiles />} />
        <Route path="/profiling/new" element={<ProfileForm />} />
        <Route path="/profiling/:id/edit" element={<ProfileForm />} />
        <Route path="/profiling/:id" element={<ProfileDetails />} />
        <Route path="/profiling/:id/:tab" element={<ProfileDetails />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
