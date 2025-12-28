import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

export default function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (isAuthenticated) return <Outlet />

  const from = `${location.pathname}${location.search || ''}`
  return <Navigate to="/login" replace state={{ from }} />
}
