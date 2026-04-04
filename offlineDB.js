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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="max-w-lg mx-auto flex justify-around">
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
  )
}