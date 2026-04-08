import { NavLink } from 'react-router-dom'
import { Home, PlusCircle, QrCode, History, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function BottomNav() {
  const { isAdmin } = useAuth()

  const navItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/nueva', icon: PlusCircle, label: 'Nueva' },
    { to: '/autorizar', icon: QrCode, label: 'Autorizar' },
    { to: '/historial', icon: History, label: 'Historial' },
    ...(isAdmin ? [{ to: '/admin', icon: Settings, label: 'Admin' }] : []),
  ]

  return (
    <>
      {/* Navegación inferior para Móviles */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-4 min-w-[64px] transition ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Menú lateral (Sidebar) para Desktop y Tablets grandes */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white border-r border-gray-200 z-50">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
          <h2 className="text-xl font-black text-primary tracking-tight">SGI Catedral</h2>
        </div>
        <div className="flex flex-col flex-1 gap-2 p-4 pt-6 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  )
}
