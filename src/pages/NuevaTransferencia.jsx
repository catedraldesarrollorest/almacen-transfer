import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOffline } from '../contexts/OfflineContext'
import { supabase, getWarehouses, getProductos, createTransferenciaConProductos } from '../lib/supabase'
import { guardarTransferenciaPendiente, getWarehousesCache, getPersonalCache, buscarProductosCache } from '../lib/offlineDB'

export default function NuevaTransferencia() {
  const navigate = useNavigate()
  const { user, isAdmin, warehouseId } = useAuth()
  const { isOffline } = useOffline()

  const [almacenes, setAlmacenes] = useState([])
  const [personalOrigen, setPersonalOrigen] = useState([])
  const [personalDestino, setPersonalDestino] = useState([])
  // Operador: origen fijo a su almacén. Admin: puede elegir.
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [entregaId, setEntregaId] = useState('')
  const [recibeId, setRecibeId] = useState('')
  const [productos, setProductos] = useState([{ nombre: '', cantidad: '', unidad: '' }])
  const [sugerencias, setSugerencias] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  // Cargar personal cuando cambia el almacén origen
  useEffect(() => {
    async function loadPersonalOrigen() {
      if (!origenId) {
        setPersonalOrigen([])
        setEntregaId('')
        return
      }
      try {
        const data = isOffline 
          ? await getPersonalCache(origenId) 
          : (await supabase.from('personal_almacen').select('*').eq('almacen_id', origenId).order('nombre')).data
        setPersonalOrigen(data || [])
      } catch (err) {
        const cache = await getPersonalCache(origenId)
        setPersonalOrigen(cache || [])
      }
      setEntregaId('')
    }
    loadPersonalOrigen()
  }, [origenId, isOffline])

  // Cargar personal cuando cambia el almacén destino
  useEffect(() => {
    async function loadPersonalDestino() {
      if (!destinoId) {
        setPersonalDestino([])
        setRecibeId('')
        return
      }
      try {
        const data = isOffline 
          ? await getPersonalCache(destinoId) 
          : (await supabase.from('personal_almacen').select('*').eq('almacen_id', destinoId).order('nombre')).data
        setPersonalDestino(data || [])
      } catch (err) {
        const cache = await getPersonalCache(destinoId)
        setPersonalDestino(cache || [])
      }
      setRecibeId('')
    }
    loadPersonalDestino()
  }, [destinoId, isOffline])

  async function buscarProductos(idx, query) {
    const updated = [...productos]
    updated[idx].nombre = query
    setProductos(updated)
    setProductoActivo(idx)
    if (query.length < 2) { setSugerencias([]); return }
    let results
    try {
      results = isOffline ? await buscarProductosCache(query) : await getProductos(query)
    } catch {
      results = await buscarProductosCache(query)
    }
    setSugerencias(results || [])
  }

  function seleccionarProducto(idx, prod) {
    const updated = [...productos]
    updated[idx].nombre = prod.nombre
    updated[idx].unidad = prod.unidad_medida || ''
    setProductos(updated)
    setSugerencias([])
    setProductoActivo(null)
  }

  function agregarProducto() {
    setProductos([...productos, { nombre: '', cantidad: '', unidad: '' }])
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

    if (!origenId || !destinoId) {
      setError('Selecciona almacén de origen y destino')
      return
    }
    if (origenId === destinoId) {
      setError('Origen y destino no pueden ser el mismo')
      return
    }
    const productosValidos = productos.filter(p => p.nombre && p.cantidad)
    if (productosValidos.length === 0) {
      setError('Agrega al menos un producto con cantidad')
      return
    }

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

      // Si no hay conexión, guardar localmente
      if (isOffline) {
        await guardarTransferenciaPendiente({ ...transferencia, productos: productosValidos })
        navigate('/')
        return
      }

      // Online: usar RPC atómico (tranferencia + productos en una sola operación)
      const productosProcesados = productosValidos.map(p => ({
        nombre: p.nombre,
        cantidad: parseFloat(p.cantidad),
        unidad: p.unidad
      }))
      await createTransferenciaConProductos(transferencia, productosProcesados)

      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al crear la transferencia')
    } finally {
      setLoading(false)
    }
  }

  // Almacenes disponibles para destino (excluir el origen)
  const almacenesDestino = almacenes.filter(a => String(a.id) !== origenId)

  const origenNombre = almacenes.find(a => String(a.id) === origenId)?.nombre

  return (
    <div className="min-h-screen bg-gray-50 max-w-3xl mx-auto md:rounded-2xl md:shadow-sm md:overflow-hidden md:border border-gray-100">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Nueva Transferencia</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Almacenes */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Almacenes</h2>

          {/* Origen */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Origen</label>
            {!isAdmin && warehouseId ? (
              <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
                {origenNombre || 'Cargando...'}
              </div>
            ) : (
              <select
                value={origenId}
                onChange={e => { setOrigenId(e.target.value); setDestinoId('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value="">Seleccionar almacén</option>
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Destino */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Destino</label>
            <select
              value={destinoId}
              onChange={e => setDestinoId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Seleccionar almacén</option>
              {almacenesDestino.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsables */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Responsables</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Quien entrega</label>
            <select
              value={entregaId}
              onChange={e => setEntregaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Seleccionar persona</option>
              {personalOrigen.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}{p.cargo ? ` - ${p.cargo}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Quien recibe</label>
            <select
              value={recibeId}
              onChange={e => setRecibeId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Seleccionar persona</option>
              {personalDestino.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}{p.cargo ? ` - ${p.cargo}` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Productos</h2>
          <div className="space-y-3">
            {productos.map((prod, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={prod.nombre}
                    onChange={e => buscarProductos(idx, e.target.value)}
                    onBlur={() => setTimeout(() => setSugerencias([]), 200)}
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Buscar producto..."
                  />
                  {productoActivo === idx && sugerencias.length > 0 && (
                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {sugerencias.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => seleccionarProducto(idx, s)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          {s.nombre}
                          {s.unidad_medida && <span className="text-gray-400 ml-1">({s.unidad_medida})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    value={prod.cantidad}
                    onChange={e => actualizarProducto(idx, 'cantidad', e.target.value)}
                    className="flex-1 min-w-[80px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Cantidad"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="text"
                    value={prod.unidad}
                    onChange={e => actualizarProducto(idx, 'unidad', e.target.value)}
                    className="flex-1 min-w-[100px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Unidad"
                  />
                  {productos.length > 1 && (
                    <button type="button" onClick={() => eliminarProducto(idx)} className="p-2 text-error hover:bg-red-50 rounded-lg flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={agregarProducto}
            className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-lg py-2.5 text-sm text-gray-500 flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition"
          >
            <Plus className="w-4 h-4" />
            Agregar producto
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white rounded-xl py-4 font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-60 shadow-sm"
        >
          {loading ? 'Creando transferencia...' : 'Crear Transferencia'}
        </button>
      </form>
    </div>
  )
}
