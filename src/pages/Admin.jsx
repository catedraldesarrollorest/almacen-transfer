import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Users, Warehouse, FileSpreadsheet, BarChart2, Trash2, AlertTriangle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Admin() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [showLimpieza, setShowLimpieza] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [pinConfirmacion, setPinConfirmacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '940209'

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
      icon: Trash2,
      title: 'Limpieza de Historial',
      desc: 'Borrar registros de transferencias antiguas',
      action: () => setShowLimpieza(true)
    },
  ]

  async function handleBorrarHistorial() {
    if (!fechaInicio || !fechaFin) {
      setError('Selecciona el rango de fechas')
      return
    }
    if (pinConfirmacion !== ADMIN_PIN) {
      setError('PIN de administrador incorrecto')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Obtener IDs de transferencias en el rango
      const { data: transArr, error: fetchErr } = await supabase
        .from('transferencias')
        .select('id')
        .gte('created_at', `${fechaInicio}T00:00:00`)
        .lte('created_at', `${fechaFin}T23:59:59`)

      if (fetchErr) throw fetchErr
      if (!transArr || transArr.length === 0) {
        alert('No hay registros en ese rango de fechas')
        setLoading(false)
        return
      }

      const ids = transArr.map(t => t.id)

      // 2. Borrar productos asociados
      const { error: delProdErr } = await supabase
        .from('transferencia_productos')
        .delete()
        .in('transferencia_id', ids)

      if (delProdErr) throw delProdErr

      // 3. Borrar transferencias
      const { error: delTransErr } = await supabase
        .from('transferencias')
        .delete()
        .in('id', ids)

      if (delTransErr) throw delTransErr

      alert(`Se han eliminado ${ids.length} transferencias correctamente.`)
      setShowLimpieza(false)
      setPinConfirmacion('')
    } catch (err) {
      setError(err.message || 'Error al borrar historial')
    } finally {
      setLoading(false)
    }
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

      {/* Modal de Limpieza */}
      {showLimpieza && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                <Trash2 className="w-5 h-5 text-error" />
                Limpieza de Historial
              </h2>
              <button onClick={() => { setShowLimpieza(false); setError(''); }} className="p-1">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-center space-y-3">
                <AlertTriangle className="w-16 h-16 text-red-600 mx-auto animate-pulse" />
                <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter">
                  ¡ADVERTENCIA CRÍTICA!
                </h3>
                <p className="text-sm text-red-700 font-medium leading-relaxed">
                  Esta acción eliminará **PERMANENTEMENTE** todas las transferencias y sus productos en el rango de fechas seleccionado. 
                  <br /><br />
                  **NO SE PUEDE DESHACER.**
                </p>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-200 text-red-700 text-sm p-3 rounded-lg text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar con PIN Admin</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="Escribe el PIN de administrador"
                    value={pinConfirmacion}
                    onChange={(e) => setPinConfirmacion(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleBorrarHistorial}
                disabled={loading || !fechaInicio || !fechaFin || !pinConfirmacion}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 transition-all disabled:opacity-50 active:scale-95 text-lg"
              >
                {loading ? 'Borrando...' : 'BORRAR AHORA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
