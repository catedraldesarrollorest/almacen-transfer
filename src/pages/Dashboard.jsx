import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PlusCircle, Clock, CheckCircle, ArrowRightLeft, LogOut, RefreshCw, ChevronRight } from 'lucide-react'
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
      // Start of current month for stats
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      // Stats query — all transfers this month, no limit
      let statsQuery = supabase
        .from('transferencias')
        .select('estado')
        .gte('created_at', startOfMonth.toISOString())

      if (!isAdmin && warehouseId) {
        statsQuery = statsQuery.or(`origen_id.eq.${warehouseId},destino_id.eq.${warehouseId}`)
      }

      // Recent transfers query — last 5 for display
      let recentQuery = supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(nombre)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!isAdmin && warehouseId) {
        recentQuery = recentQuery.or(`origen_id.eq.${warehouseId},destino_id.eq.${warehouseId}`)
      }

      const [{ data: statsData, error: e1 }, { data: recentData, error: e2 }] =
        await Promise.all([statsQuery, recentQuery])

      if (e1) throw e1
      if (e2) throw e2

      if (statsData) {
        setStats({
          pendientes: statsData.filter(t => t.estado === 'pendiente').length,
          completadas: statsData.filter(t => t.estado === 'completado').length,
        })
      }
      if (recentData) setRecientes(recentData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, warehouseId])

  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData, location.key])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function irAAutorizar(t) {
    navigate('/autorizar', { state: { transferenciaId: t.id } })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-red-200 text-sm">Bienvenido</p>
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
              <RefreshCw className={`w-5 h-5 text-red-200 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleSignOut} className="p-2 rounded-lg hover:bg-white/10 transition">
              <LogOut className="w-5 h-5 text-red-200" />
            </button>
          </div>
        </div>

        {/* Stats — counts all transfers of the current month */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-xs text-red-200">Pendientes (mes)</span>
            </div>
            <p className="text-2xl font-bold">{stats.pendientes}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-xs text-red-200">Completadas (mes)</span>
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
              {recientes.map(t => {
                const isPendiente = t.estado === 'pendiente'
                const content = (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isPendiente ? 'bg-amber-100 text-amber-700' :
                        t.estado === 'completado' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t.estado}
                      </span>
                      {isPendiente && <ChevronRight className="w-4 h-4 text-amber-500" />}
                    </div>
                  </div>
                )

                return isPendiente ? (
                  <button
                    key={t.id}
                    onClick={() => irAAutorizar(t)}
                    className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md hover:border-amber-200 border border-transparent transition"
                  >
                    {content}
                  </button>
                ) : (
                  <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm">
                    {content}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
