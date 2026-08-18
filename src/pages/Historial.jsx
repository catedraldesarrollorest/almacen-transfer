import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Search, ArrowRightLeft, ChevronDown, ChevronUp, Package, RefreshCw, X, Download, Filter } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/dateUtils'

const PAGE_SIZE = 100

function exportCSV(transferencias, filtros) {
  const rows = []
  rows.push(['Fecha', 'Origen', 'Destino', 'Entrega', 'Recibe', 'Estado', 'Producto', 'Cantidad', 'Unidad', 'Existencia', 'Cajas', 'Und/Caja', 'Código QR'])

  transferencias.forEach(t => {
    const prods = t.productos || []
    if (prods.length === 0) {
      rows.push([
        formatFecha(t.created_at, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        t.origen?.nombre || '',
        t.destino?.nombre || '',
        t.entrega_nombre || '',
        t.recibe_nombre || '',
        t.estado || '',
        '', '', '', '', '', '',
        t.codigo_qr || '',
      ])
    } else {
      prods.forEach(p => {
        rows.push([
          formatFecha(t.created_at, { day: '2-digit', month: '2-digit', year: 'numeric' }),
          t.origen?.nombre || '',
          t.destino?.nombre || '',
          t.entrega_nombre || '',
          t.recibe_nombre || '',
          t.estado || '',
          p.producto || '',
          p.cantidad ?? '',
          p.unidad || '',
          p.existencia ?? '',
          p.cajas ?? '',
          p.unidades_por_caja ?? '',
          t.codigo_qr || '',
        ])
      })
    }
  })

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const partes = ['historial']
  if (filtros.origen) partes.push(`desde-${filtros.origen}`)
  if (filtros.destino) partes.push(`hacia-${filtros.destino}`)
  if (filtros.estado !== 'todos') partes.push(filtros.estado)
  a.download = partes.join('_') + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Historial() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, warehouseId, loading: authLoading } = useAuth()
  const [transferencias, setTransferencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroOrigen, setFiltroOrigen] = useState('')
  const [filtroDestino, setFiltroDestino] = useState('')
  const [almacenes, setAlmacenes] = useState([])
  const [showFiltros, setShowFiltros] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    supabase.from('warehouses').select('id, nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setAlmacenes(data || []))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(busqueda.trim().toLowerCase())
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busqueda])

  const fetchPage = useCallback(async ({ query, estado, origenId, destinoId, currentOffset, append }) => {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      let transfers = []

      if (query) {
        const [{ data: wMatches }, { data: pMatches }] = await Promise.all([
          supabase.from('warehouses').select('id').ilike('nombre', `%${query}%`).limit(200),
          supabase.from('transferencia_productos').select('transferencia_id').ilike('producto', `%${query}%`).limit(500),
        ])

        const wIds = wMatches?.map(w => w.id) || []
        const tIds = [...new Set(pMatches?.map(p => p.transferencia_id) || [])]

        const searchParts = [
          `entrega_nombre.ilike.%${query}%`,
          `recibe_nombre.ilike.%${query}%`,
          `codigo_qr.ilike.%${query}%`,
        ]
        wIds.forEach(id => {
          searchParts.push(`origen_id.eq.${id}`)
          searchParts.push(`destino_id.eq.${id}`)
        })
        if (tIds.length) searchParts.push(`id.in.(${tIds.join(',')})`)

        let q = supabase
          .from('transferencias')
          .select('*, origen:origen_id(nombre), destino:destino_id(nombre), productos:transferencia_productos(*)')
          .or(searchParts.join(','))
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + PAGE_SIZE - 1)

        if (!isAdmin && warehouseId) q = q.or(`origen_id.eq.${warehouseId},destino_id.eq.${warehouseId}`)
        if (estado !== 'todos') q = q.eq('estado', estado)
        if (origenId) q = q.eq('origen_id', origenId)
        if (destinoId) q = q.eq('destino_id', destinoId)

        const { data } = await q
        transfers = data || []
      } else {
        let q = supabase
          .from('transferencias')
          .select('*, origen:origen_id(nombre), destino:destino_id(nombre), productos:transferencia_productos(*)')
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + PAGE_SIZE - 1)

        if (!isAdmin && warehouseId) q = q.or(`origen_id.eq.${warehouseId},destino_id.eq.${warehouseId}`)
        if (estado !== 'todos') q = q.eq('estado', estado)
        if (origenId) q = q.eq('origen_id', origenId)
        if (destinoId) q = q.eq('destino_id', destinoId)

        const { data } = await q
        transfers = data || []
      }

      setHasMore(transfers.length === PAGE_SIZE)
      setOffset(currentOffset + transfers.length)
      setTransferencias(prev => append ? [...prev, ...transfers] : transfers)
    } catch (e) {
      console.error(e)
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }, [isAdmin, warehouseId])

  useEffect(() => {
    if (authLoading) return
    setOffset(0)
    setHasMore(false)
    fetchPage({ query: debouncedQuery, estado: filtroEstado, origenId: filtroOrigen, destinoId: filtroDestino, currentOffset: 0, append: false })
  }, [authLoading, fetchPage, debouncedQuery, filtroEstado, filtroOrigen, filtroDestino, location.key])

  function loadMore() {
    if (loadingMore || !hasMore) return
    fetchPage({ query: debouncedQuery, estado: filtroEstado, origenId: filtroOrigen, destinoId: filtroDestino, currentOffset: offset, append: true })
  }

  function refresh() {
    setOffset(0)
    setHasMore(false)
    fetchPage({ query: debouncedQuery, estado: filtroEstado, origenId: filtroOrigen, destinoId: filtroDestino, currentOffset: 0, append: false })
  }

  function limpiarFiltros() {
    setFiltroOrigen('')
    setFiltroDestino('')
    setFiltroEstado('todos')
    setBusqueda('')
  }

  const q = debouncedQuery
  const filtrosActivos = filtroOrigen || filtroDestino || filtroEstado !== 'todos' || busqueda

  const estadoColor = {
    pendiente: 'bg-amber-100 text-amber-700',
    completado: 'bg-green-100 text-green-700',
  }

  const nombreOrigen = almacenes.find(a => String(a.id) === String(filtroOrigen))?.nombre
  const nombreDestino = almacenes.find(a => String(a.id) === String(filtroDestino))?.nombre

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
          <div className="flex items-center gap-1">
            {!loading && transferencias.length > 0 && (
              <button
                onClick={() => exportCSV(transferencias, { origen: nombreOrigen, destino: nombreDestino, estado: filtroEstado })}
                className="p-2 text-gray-500 hover:text-green-600 transition"
                title="Exportar CSV"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowFiltros(v => !v)}
              className={`p-2 transition relative ${showFiltros || filtroOrigen || filtroDestino ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
              title="Filtros de almacén"
            >
              <Filter className="w-5 h-5" />
              {(filtroOrigen || filtroDestino) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-primary transition"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
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

        {showFiltros && (
          <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Origen</label>
                <select
                  value={filtroOrigen}
                  onChange={e => setFiltroOrigen(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Todos</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Destino</label>
                <select
                  value={filtroDestino}
                  onChange={e => setFiltroDestino(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Todos</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            {(filtroOrigen || filtroDestino) && (
              <button
                onClick={() => { setFiltroOrigen(''); setFiltroDestino('') }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Limpiar filtros de almacén
              </button>
            )}
          </div>
        )}

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
          {filtroOrigen && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap flex items-center gap-1">
              Desde: {nombreOrigen}
              <button onClick={() => setFiltroOrigen('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filtroDestino && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap flex items-center gap-1">
              Hacia: {nombreDestino}
              <button onClick={() => setFiltroDestino('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {!loading && (q || filtroOrigen || filtroDestino || filtroEstado !== 'todos') && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 whitespace-nowrap">
              {transferencias.length}{hasMore ? '+' : ''} resultado{transferencias.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transferencias.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{filtrosActivos ? 'Sin resultados para los filtros aplicados' : 'No hay transferencias'}</p>
            {filtrosActivos && (
              <button onClick={limpiarFiltros} className="mt-3 text-sm text-primary font-medium">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {transferencias.map(t => {
              const isOpen = expandedId === t.id
              const productos = t.productos || []
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

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition flex items-center justify-center gap-2 shadow-sm"
              >
                {loadingMore
                  ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Cargando...</>
                  : '⬇ Cargar 100 más'
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
