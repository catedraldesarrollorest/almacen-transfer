import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Package, CheckCircle, RefreshCw, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatFechaHora } from '../lib/dateUtils'

export default function NoLeidas() {
  const navigate = useNavigate()
  const [noLeidas, setNoLeidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [productosPorId, setProductosPorId] = useState({})
  const [marcando, setMarcando] = useState(null)

  useEffect(() => {
    cargarNoLeidas()
  }, [])

  async function cargarNoLeidas() {
    setLoading(true)
    try {
      const { data: leidas } = await supabase
        .from('transferencias_leidas')
        .select('transferencia_id')
      const leidasIds = (leidas || []).map(l => l.transferencia_id)

      let query = supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(nombre)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (leidasIds.length > 0) {
        query = query.not('id', 'in', `(${leidasIds.join(',')})`)
      }

      const { data } = await query
      setNoLeidas(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleDetalle(id) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!productosPorId[id]) {
      const { data } = await supabase
        .from('transferencia_productos')
        .select('*')
        .eq('transferencia_id', id)
      if (data) setProductosPorId(p => ({ ...p, [id]: data }))
    }
  }

  async function marcarLeida(e, id) {
    e.stopPropagation()
    setMarcando(id)
    try {
      await supabase.from('transferencias_leidas').insert([{ transferencia_id: id }])
      setNoLeidas(prev => prev.filter(t => t.id !== id))
      setExpandedId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setMarcando(null)
    }
  }

  const estadoColor = {
    pendiente: 'bg-amber-100 text-amber-700',
    completado: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sin revisar</h1>
              <p className="text-xs text-gray-500">Transferencias pendientes de revisión</p>
            </div>
          </div>
          <button
            onClick={cargarNoLeidas}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-primary transition"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : noLeidas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle className="w-16 h-16 text-green-300 mb-4" />
            <p className="text-lg font-semibold text-gray-700">Todo al día</p>
            <p className="text-sm text-gray-400 mt-1">No hay transferencias pendientes de revisión</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-gray-700">{noLeidas.length} transferencia{noLeidas.length !== 1 ? 's' : ''} sin revisar</p>
            </div>
            <div className="divide-y divide-gray-50">
              {noLeidas.map(t => (
                <div key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggleDetalle(t.id)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {t.origen?.nombre} → {t.destino?.nombre}
                        </p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-500">
                          {t.entrega_nombre && <span>Entrega: {t.entrega_nombre}</span>}
                          {t.recibe_nombre && <span>Recibe: {t.recibe_nombre}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[t.estado] || 'bg-gray-100 text-gray-600'}`}>
                          {t.estado}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatFechaHora(t.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {expandedId === t.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </div>
                    </div>
                  </button>

                  {expandedId === t.id && (
                    <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100">
                      {!productosPorId[t.id] ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        </div>
                      ) : (
                        <div className="pt-3 space-y-3">
                          {productosPorId[t.id].length === 0 ? (
                            <p className="text-xs text-gray-400 text-center">Sin productos registrados</p>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Package className="w-3.5 h-3.5 text-primary" />
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Productos</p>
                              </div>
                              <div className="space-y-1">
                                {productosPorId[t.id].map((p, i) => (
                                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                    <span className="text-gray-700">{p.producto}</span>
                                    <div className="text-right">
                                      <span className="font-medium text-gray-900">{p.cantidad} {p.unidad}</span>
                                      {p.existencia != null && (
                                        <span className="block text-xs text-amber-600">Exist: {p.existencia}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={(e) => marcarLeida(e, t.id)}
                            disabled={marcando === t.id}
                            className="w-full bg-green-500 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {marcando === t.id ? 'Marcando...' : 'Marcar como leída'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
