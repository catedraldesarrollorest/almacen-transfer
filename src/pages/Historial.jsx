import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, ArrowRightLeft, ChevronDown, ChevronUp, Package } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Historial() {
  const navigate = useNavigate()
  const { isAdmin, warehouseId, loading: authLoading } = useAuth()
  const [transferencias, setTransferencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [expandedId, setExpandedId] = useState(null)
  const [productosPorId, setProductosPorId] = useState({})

  useEffect(() => {
    if (!authLoading) {
      loadHistorial()
    }
  }, [authLoading, isAdmin, warehouseId])

  async function loadHistorial() {
    try {
      let query = supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(nombre)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!isAdmin && warehouseId) {
        query = query.or(`origen_id.eq.${warehouseId},destino_id.eq.${warehouseId}`)
      }

      const { data, error } = await query
      if (!error && data) setTransferencias(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleDetalle(id) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!productosPorId[id]) {
      const { data } = await supabase
        .from('transferencia_productos')
        .select('*')
        .eq('transferencia_id', id)
      if (data) setProductosPorId(p => ({ ...p, [id]: data }))
    }
  }

  const filtradas = transferencias.filter(t => {
    const matchEstado = filtroEstado === 'todos' || t.estado === filtroEstado
    const matchBusqueda = !busqueda ||
      t.origen?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.destino?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.codigo_qr?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.entrega_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const estadoColor = {
    pendiente: 'bg-amber-100 text-amber-700',
    completado: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isAdmin ? 'Historial completo' : 'Mi historial'}
          </h1>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Buscar por almacén, nombre o código..."
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['todos', 'pendiente', 'completado'].map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                filtroEstado === estado
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {estado === 'todos' ? 'Todos' : estado.charAt(0).toUpperCase() + estado.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay transferencias</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map(t => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleDetalle(t.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {t.origen?.nombre} → {t.destino?.nombre}
                      </p>
                      {t.codigo_qr && (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{t.codigo_qr}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-500">
                        {t.entrega_nombre && <span>Entrega: {t.entrega_nombre}</span>}
                        {t.recibe_nombre && <span>Recibe: {t.recibe_nombre}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor[t.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {t.estado}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(t.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                      </span>
                      {expandedId === t.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400 mt-0.5" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5" />
                      }
                    </div>
                  </div>
                </button>

                {expandedId === t.id && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                    {!productosPorId[t.id] ? (
                      <div className="flex justify-center py-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    ) : productosPorId[t.id].length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Sin productos registrados</p>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Package className="w-3.5 h-3.5 text-primary" />
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Productos</p>
                        </div>
                        <div className="space-y-1">
                          {productosPorId[t.id].map((p, i) => (
                            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                              <span className="text-gray-700">{p.producto}</span>
                              <span className="font-medium text-gray-900">{p.cantidad} {p.unidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
