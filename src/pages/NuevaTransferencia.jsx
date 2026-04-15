import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Search, RefreshCw, PlusCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOffline } from '../contexts/OfflineContext'
import { supabase, getWarehouses, getProductos } from '../lib/supabase'
import { guardarTransferenciaPendiente, getWarehousesCache, getPersonalCache, buscarProductosCache } from '../lib/offlineDB'

export default function NuevaTransferencia() {
  const navigate = useNavigate()
  const { user, isAdmin, warehouseId } = useAuth()
  const { isOffline, syncCatalogs } = useOffline()
  const [refreshing, setRefreshing] = useState(false)

  const [almacenes, setAlmacenes] = useState([])
  const [personalOrigen, setPersonalOrigen] = useState([])
  const [personalDestino, setPersonalDestino] = useState([])
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [entregaId, setEntregaId] = useState('')
  const [recibeId, setRecibeId] = useState('')
  const [productos, setProductos] = useState([{ nombre: '', cantidad: '', unidad: '', existencia: '' }])
  const [sugerencias, setSugerencias] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const data = isOffline ? await getWarehousesCache() : await getWarehouses()
        setAlmacenes(data || [])
        if (!isAdmin && warehouseId) {
          setOrigenId(String(warehouseId))
        }
      } catch (err) {
        console.error(err)
        const cache = await getWarehousesCache()
        setAlmacenes(cache || [])
      }
    }
    loadWarehouses()
  }, [isAdmin, warehouseId, isOffline])

  useEffect(() => {
    if (!isOffline) syncCatalogs()
  }, [])

  useEffect(() => {
    async function loadPersonalOrigen() {
      if (!origenId) { setPersonalOrigen([]); setEntregaId(''); return }
      try {
        const data = isOffline
          ? await getPersonalCache(origenId)
          : (await supabase.from('personal_almacen').select('*').eq('almacen_id', origenId).order('nombre')).data
        setPersonalOrigen(data || [])
      } catch {
        const cache = await getPersonalCache(origenId)
        setPersonalOrigen(cache || [])
      }
      setEntregaId('')
    }
    loadPersonalOrigen()
  }, [origenId, isOffline])

  useEffect(() => {
    async function loadPersonalDestino() {
      if (!destinoId) { setPersonalDestino([]); setRecibeId(''); return }
      try {
        const data = isOffline
          ? await getPersonalCache(destinoId)
          : (await supabase.from('personal_almacen').select('*').eq('almacen_id', destinoId).order('nombre')).data
        setPersonalDestino(data || [])
      } catch {
        const cache = await getPersonalCache(destinoId)
        setPersonalDestino(cache || [])
      }
      setRecibeId('')
    }
    loadPersonalDestino()
  }, [destinoId, isOffline])

  function buscarProductos(idx, query) {
    const updated = [...productos]
    updated[idx].nombre = query
    setProductos(updated)
    setProductoActivo(idx)
    clearTimeout(debounceRef.current)
    if (query.length < 2) { setSugerencias([]); return }
    debounceRef.current = setTimeout(async () => {
      let results
      try {
        results = isOffline ? await buscarProductosCache(query) : await getProductos(query)
      } catch {
        results = await buscarProductosCache(query)
      }
      setSugerencias(results || [])
    }, 300)
  }

  function seleccionarProducto(idx, prod) {
    const updated = [...productos]
    updated[idx].nombre = prod.nombre
    updated[idx].unidad = prod.unidad_medida || ''
    setProductos(updated)
    setSugerencias([])
    setProductoActivo(null)
    // Auto-fetch última existencia si el almacén la requiere
    if (tieneExistencia && origenId) {
      fetchUltimaExistencia(origenId, prod.nombre).then(existencia => {
        if (existencia !== null) {
          setProductos(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], existencia: String(existencia) }
            return next
          })
        }
      })
    }
  }

  async function crearNuevoProducto(idx, nombre) {
    try {
      const { data, error } = await supabase
        .from('productos_base')
        .insert([{ nombre: nombre.trim() }])
        .select()
        .single()
      if (error) throw error
      // Auto-seleccionar el producto recién creado
      seleccionarProducto(idx, data)
    } catch (e) {
      setError('Error al crear el producto: ' + (e.message || ''))
    }
  }

  function agregarProducto() {
    setProductos([...productos, { nombre: '', cantidad: '', unidad: '', existencia: '' }])
  }

  function eliminarProducto(idx) {
    if (productos.length === 1) return
    setProductos(productos.filter((_, i) => i !== idx))
  }

  function actualizarProducto(idx, campo, valor) {
    const updated = [...productos]
    updated[idx][campo] = valor
    setProductos(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!origenId || !destinoId) return setError('Selecciona almacén de origen y destino')
    if (origenId === destinoId) return setError('Origen y destino no pueden ser el mismo')
    const productosValidos = productos.filter(p => p.nombre.trim() && p.cantidad)
    if (productosValidos.length === 0) return setError('Agrega al menos un producto con cantidad')

    setLoading(true)
    try {
      const transferencia = {
        origen_id: parseInt(origenId),
        destino_id: parseInt(destinoId),
        entrega_nombre: entregaId ? personalOrigen.find(p => String(p.id) === String(entregaId))?.nombre : null,
        recibe_nombre: recibeId ? personalDestino.find(p => String(p.id) === String(recibeId))?.nombre : null,
        fecha_hora: new Date().toISOString(),
        estado: 'pendiente',
      }

      if (isOffline) {
        await guardarTransferenciaPendiente({ ...transferencia, productos: productosValidos })
        navigate('/')
        return
      }

      // Inserción directa para soportar el campo existencia
      const { data: created, error: errTransfer } = await supabase
        .from('transferencias')
        .insert([transferencia])
        .select()
        .single()
      if (errTransfer) throw errTransfer

      const productosParaInsertar = productosValidos.map(p => {
        const row = {
          transferencia_id: created.id,
          producto: p.nombre.trim(),
          cantidad: parseFloat(p.cantidad),
          unidad: p.unidad.trim() || '',
        }
        if (tieneExistencia && p.existencia !== '') {
          row.existencia = parseFloat(p.existencia)
        }
        return row
      })

      const { error: errProd } = await supabase
        .from('transferencia_productos')
        .insert(productosParaInsertar)
      if (errProd) throw errProd

      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al crear la transferencia')
    } finally {
      setLoading(false)
    }
  }

  const almacenesDestino = almacenes.filter(a => String(a.id) !== origenId)
  const origenAlmacen = almacenes.find(a => String(a.id) === origenId)
  const origenNombre = origenAlmacen?.nombre
  const _nombre = origenAlmacen?.nombre?.toLowerCase() || ''
  const tieneExistencia = _nombre.includes('central') || _nombre.includes('ciudad libertad') || _nombre.includes('copmar')
  const puedeCrearProducto = isAdmin || user?.warehouseName?.toLowerCase().includes('deliver')

  async function fetchUltimaExistencia(origenId, nombreProducto) {
    try {
      const { data: recientes } = await supabase
        .from('transferencias')
        .select('id')
        .eq('origen_id', parseInt(origenId))
        .order('created_at', { ascending: false })
        .limit(50)
      if (!recientes?.length) return null
      const ids = recientes.map(t => t.id)
      const { data: prods } = await supabase
        .from('transferencia_productos')
        .select('existencia, transferencia_id')
        .in('transferencia_id', ids)
        .ilike('producto', nombreProducto.trim())
        .not('existencia', 'is', null)
      if (!prods?.length) return null
      // Ordenar por la transferencia más reciente (posición en el array ids)
      prods.sort((a, b) => ids.indexOf(a.transferencia_id) - ids.indexOf(b.transferencia_id))
      return prods[0].existencia
    } catch {
      return null
    }
  }
  const productosValidos = productos.filter(p => p.nombre.trim() && p.cantidad).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary text-white p-4 pt-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Nueva Transferencia</h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true)
              await syncCatalogs()
              try {
                const data = await getWarehouses()
                setAlmacenes(data || [])
                if (!isAdmin && warehouseId) setOrigenId(String(warehouseId))
              } catch {}
              setRefreshing(false)
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : 'text-red-200'}`} />
          </button>
        </div>
        <p className="text-red-200 text-xs ml-8">
          {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Almacenes */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Almacenes</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Origen</label>
              {!isAdmin && warehouseId ? (
                <div className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-800">
                  {origenNombre || '...'}
                </div>
              ) : (
                <select
                  value={origenId}
                  onChange={e => { setOrigenId(e.target.value); setDestinoId('') }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                >
                  <option value="">Seleccionar almacén de origen</option>
                  {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-100" />
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs">→</span>
              </div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Destino</label>
              <select
                value={destinoId}
                onChange={e => setDestinoId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
              >
                <option value="">Seleccionar almacén destino</option>
                {almacenesDestino.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Responsables */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Responsables</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Quien entrega</label>
              {personalOrigen.length > 0 ? (
                <select
                  value={entregaId}
                  onChange={e => setEntregaId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Seleccionar persona</option>
                  {personalOrigen.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}{p.cargo ? ` - ${p.cargo}` : ''}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={entregaId}
                  onChange={e => setEntregaId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Nombre completo"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Quien recibe</label>
              {personalDestino.length > 0 ? (
                <select
                  value={recibeId}
                  onChange={e => setRecibeId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Seleccionar persona</option>
                  {personalDestino.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}{p.cargo ? ` - ${p.cargo}` : ''}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={recibeId}
                  onChange={e => setRecibeId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Nombre completo"
                />
              )}
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Productos</p>
            {productosValidos > 0 && (
              <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {productosValidos}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {productos.map((prod, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-2">
                <div className="relative flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={prod.nombre}
                      onChange={e => buscarProductos(idx, e.target.value)}
                      onBlur={() => setTimeout(() => { setSugerencias([]); setProductoActivo(null) }, 200)}
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Nombre del producto"
                    />
                  </div>
                  {productos.length > 1 && (
                    <button type="button" onClick={() => eliminarProducto(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {productoActivo === idx && (sugerencias.length > 0 || (puedeCrearProducto && prod.nombre.length >= 2)) && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {sugerencias.length === 0 && (
                        <p className="px-3 py-2 text-xs text-gray-400 italic">Sin resultados para "{prod.nombre}"</p>
                      )}
                      {sugerencias.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => seleccionarProducto(idx, s)}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium">{s.nombre}</span>
                          {s.unidad_medida && <span className="text-gray-400 text-xs">{s.unidad_medida}</span>}
                        </button>
                      ))}
                      {puedeCrearProducto && prod.nombre.trim().length >= 2 && (
                        <button
                          type="button"
                          onMouseDown={() => crearNuevoProducto(idx, prod.nombre)}
                          className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 text-primary font-semibold hover:bg-primary/5 border-t border-gray-100"
                        >
                          <PlusCircle className="w-4 h-4 flex-shrink-0" />
                          Crear "{prod.nombre.trim()}" y agregarlo
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className={`grid gap-2 ${tieneExistencia ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <input
                    type="number"
                    value={prod.cantidad}
                    onChange={e => actualizarProducto(idx, 'cantidad', e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Cantidad"
                    min="0" step="0.01"
                  />
                  <input
                    type="text"
                    value={prod.unidad}
                    onChange={e => actualizarProducto(idx, 'unidad', e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Unidad (kg, lb...)"
                  />
                  {tieneExistencia && (
                    <input
                      type="number"
                      value={prod.existencia}
                      onChange={e => actualizarProducto(idx, 'existencia', e.target.value)}
                      className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      placeholder="Existencia"
                      min="0" step="0.01"
                      title="Stock actual en almacén central"
                    />
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={agregarProducto}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition"
            >
              <Plus className="w-4 h-4" />
              Agregar otro producto
            </button>
          </div>
        </div>

        {/* Botón crear */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-base disabled:opacity-50 shadow-sm transition active:scale-[0.98]"
        >
          {loading ? 'Creando...' : `Crear Transferencia${productosValidos > 0 ? ` · ${productosValidos} producto${productosValidos > 1 ? 's' : ''}` : ''}`}
        </button>
      </form>
    </div>
  )
}
