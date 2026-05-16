import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Users, Warehouse, FileSpreadsheet, BarChart2, Trash2, ClipboardList, Boxes, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [conteoNoLeidas, setConteoNoLeidas] = useState(0)

  useEffect(() => {
    if (isAdmin) cargarConteo()
  }, [isAdmin])

  async function cargarConteo() {
    try {
      const { data: leidas } = await supabase
        .from('transferencias_leidas')
        .select('transferencia_id')
      const leidasIds = (leidas || []).map(l => l.transferencia_id)

      let query = supabase
        .from('transferencias')
        .select('id', { count: 'exact', head: true })

      if (leidasIds.length > 0) {
        query = query.not('id', 'in', `(${leidasIds.join(',')})`)
      }

      const { count } = await query
      setConteoNoLeidas(count || 0)
    } catch (e) {
      console.error(e)
    }
  }

  const menuItems = [
    {
      icon: Users,
      title: 'Gestionar Usuarios',
      desc: 'Crear y editar operadores',
      action: () => navigate('/admin/usuarios')
    },
    {
      icon: FileSpreadsheet,
      title: 'Subir Inventario Base',
      desc: 'Importar productos desde Excel',
      action: () => navigate('/inventario')
    },
    {
      icon: BarChart2,
      title: 'Reportes',
      desc: 'Exportar PDF y Excel',
      action: () => navigate('/reportes')
    },
    {
      icon: Warehouse,
      title: 'Gestionar Almacenes',
      desc: 'Crear, editar almacenes y generar QR',
      action: () => navigate('/admin/almacenes')
    },
    {
      icon: Boxes,
      title: 'Inventario',
      desc: 'Existencias actuales por almacén',
      action: () => navigate('/admin/inventario')
    },
    {
      icon: Trash2,
      title: 'Limpiar Registros',
      desc: 'Eliminar transferencias antiguas por fecha',
      action: () => navigate('/admin/limpiar'),
      danger: true
    },
  ]

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
        {/* Botón transferencias sin revisar */}
        <button
          onClick={() => navigate('/admin/no-leidas')}
          className="w-full bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Transferencias sin revisar</p>
            <p className="text-sm text-gray-500">Revisar y marcar como leídas</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {conteoNoLeidas > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
                {conteoNoLeidas}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </button>

        {/* Menú de configuración */}
        {menuItems.map((item) => (
          <button
            key={item.title}
            onClick={item.action}
            className="w-full bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition text-left"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.danger ? 'bg-red-50' : 'bg-primary/10'}`}>
              <item.icon className={`w-6 h-6 ${item.danger ? 'text-red-600' : 'text-primary'}`} />
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
