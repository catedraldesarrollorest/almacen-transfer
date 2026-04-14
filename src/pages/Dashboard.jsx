import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PlusCircle, Clock, CheckCircle, ArrowRightLeft, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { user, isAdmin, warehouseId, signOut, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState({ pendientes: 0, completadas: 0 })
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(nombre)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!isAdmin && warehouseId) {
        query = query.or(`origen_id.eq.${warehouseId},destino_id.eq.${warehouseId}`)
      }

      const { data, error } = await query
      if (error) throw error

      if (data) {
        setRecientes(data.slice(0, 5))
        setStats({
          pendientes: data.filter(t => t.estado === 'pendiente').length,
          completadas: data.filter(t => t.estado === 'completado').length,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, warehouseId])

  // Refetch when auth is ready OR whenever we navigate to this page (location.key changes)
  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData, location.key])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-4xl mx-auto md:rounded-2xl md:shadow-sm md:overflow-hidden md:border border-gray-100">
      {/* Header */}
      <div className="bg-primary text-white p-4 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm">Bienvenido</p>
            <h1 className="text-xl font-bold">{user?.warehouseName}</h1>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full mt-1 inline-block">
              {isAdmin ? 'Administrador' : 'Operador'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 text-blue-200 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleSignOut} className="p-2 rounded-lg hover:bg-white/10 transition">
              <LogOut className="w-5 h-5 text-blue-200" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-xs text-blue-200">Pendientes</span>
            </div>
            <p className="text-2xl font-bold">{stats.pendientes}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-xs text-blue-200">Completadas</span>
            </div>
            <p className="text-2xl font-bold">{stats.completadas}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <button
          onClick={() => navigate('/nueva')}
          className="w-full bg-secondary text-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:bg-secondary/90 transition"
        >
          <PlusCircle className="w-6 h-6" />
          <div className="text-left">
            <p className="font-semibold">Nueva Transferencia</p>
            <p className="text-sm text-white/80">Registrar movimiento de productos</p>
          </div>
        </button>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {isAdmin ? 'Transferencias recientes' : 'Mi almacén — recientes'}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : recientes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay transferencias aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recientes.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {t.origen?.nombre} → {t.destino?.nombre}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(t.created_at).toLocaleString('es', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      t.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                      t.estado === 'completado' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {t.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
