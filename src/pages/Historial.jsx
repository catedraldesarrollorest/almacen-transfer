import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Search, ArrowRightLeft, ChevronDown, ChevronUp, Package, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/dateUtils'

export default function Historial() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, warehouseId, loading: authLoading } = useAuth()
  const [transferencias, setTransferencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [expandedId, setExpandedId] = useState(null)

  const loadHistorial = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(nombre), productos:transferencia_productos(*)')
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
  }, [isAdmin, warehouseId])

  useEffect(() => {
    if (!authLoading) loadHistorial()
  }, [authLoading, loadHistorial, location.key])

  const q = busqueda.toLowerCase().trim()

  const filtradas = transferencias.filter(t => {
    const matchEstado = filtroEstado === 'todos' || t.estado === filtroEstado
    const matchBusqueda = !q ||
      t.origen?.nombre?.toLowerCase().includes(q) ||
      t.destino?.nombre?.toLowerCase().includes(q) ||
      t.codigo_qr?.toLowerCase().includes(q) ||
      t.entrega_nombre?.toLowerCase().includes(q) ||
      t.recibe_nombre?.toLowerCase().includes(q) ||
      t.productos?.some(p => p.producto?.toLowerCase().includes(q))
    return matchEstado && matchBusqueda
  })

  const estadoColor = {
    pendiente: 'bg-amber-100 text-amber-700',
    completado: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-4xl mx-auto md:rounded-2xl md:shadow-sm md:overflow-hidden md:border border-gray-100">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {isAdmin ? 'Historial completo' : 'Mi historial'}
            </h1>
          </div>
          <button
            onClick={loadHistorial}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-primary transition"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Buscar por almacén, persona, producto..."
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
          {q && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 whitespace-nowrap">
              {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
            </span>
          )}
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
            <p>{q ? `Sin resultados para "${busqueda}"` : 'No hay transferencias'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map(t => {
              const isOpen = expandedId === t.id
              const productos = t.productos || []
              // Highlight matching products when searching
              const matchingProds = q
                ? productos.filter(p => p.producto?.toLowerCase().includes(q))
                : []

              return (
                <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : t.id)}
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
                        {/* Show matching products as preview when searching */}
                        {matchingProds.length > 0 && !isOpen && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {matchingProds.map((p, i) => (
                              <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                {p.producto}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor[t.estado] || 'bg-gray-100 text-gray-600'}`}>
                          {t.estado}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatFecha(t.created_at, { day: '2-digit', month: 'short' })}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-gray-400 mt-0.5" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5" />
                        }
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                      {productos.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Sin productos registrados</p>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Package className="w-3.5 h-3.5 text-primary" />
                            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Productos</p>
                          </div>
                          <div className="space-y-1">
                            {productos.map((p, i) => {
                              const isMatch = q && p.producto?.toLowerCase().includes(q)
                              return (
                                <div key={i} className={`flex justify-between text-sm py-1 border-b border-gray-50 last:border-0 ${isMatch ? 'bg-blue-50 -mx-2 px-2 rounded-lg' : ''}`}>
                                  <span className={isMatch ? 'text-blue-700 font-semibold' : 'text-gray-700'}>{p.producto}</span>
                                  <div className="text-right">
                                    <span className="font-medium text-gray-900">{p.cantidad} {p.unidad}</span>
                                    {p.cajas != null && p.unidades_por_caja != null && (
                                      <span className="block text-xs text-blue-500">↳ {p.cajas} cajas × {p.unidades_por_caja} und/caja</span>
                                    )}
                                    {p.existencia != null && (
                                      <span className="block text-xs text-amber-600">Exist: {p.existencia}</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
