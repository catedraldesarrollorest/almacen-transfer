import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Users, Warehouse, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Admin() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
          <p className="text-gray-500 mt-2">Solo administradores</p>
        </div>
      </div>
    )
  }

  const menuItems = [
    {
      icon: Warehouse,
      title: 'Gestionar Almacenes',
      desc: 'Configurar PINs y responsables',
      action: () => alert('Próximamente')
    },
    {
      icon: Users,
      title: 'Gestionar Usuarios',
      desc: 'Crear y editar operadores',
      action: () => alert('Próximamente')
    },
    {
      icon: FileSpreadsheet,
      title: 'Subir Inventario Base',
      desc: 'Importar productos desde Excel',
      action: () => navigate('/inventario')
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Panel de Admin</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.title}
            onClick={item.action}
            className="w-full bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition text-left"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
