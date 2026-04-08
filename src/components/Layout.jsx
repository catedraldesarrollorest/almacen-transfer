import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import BottomNav from './BottomNav'

export default function Layout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login') {
      navigate('/login')
    }
  }, [user, loading, location.pathname, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <BottomNav />
      <main className="flex-1 w-full pb-20 md:pb-0 md:ml-64 min-h-screen transition-all">
        <div className="max-w-7xl mx-auto w-full h-full md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
