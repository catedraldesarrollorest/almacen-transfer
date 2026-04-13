import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Search, ChevronRight, Package } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOffline } from '../contexts/OfflineContext'
import { supabase, getWarehouses, getProductos, createTransferencia } from '../lib/supabase'
import { guardarTransferenciaPendiente } from '../lib/offlineDB'

export default function NuevaTransferencia() {
  const navigate = useNavigate()
  const { isAdmin, warehouseId, warehouseName } = useAuth()
  const { isOffline } = useOffline()

  const [almacenes, setAlmacenes] = useState([])
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [entregaNombre, setEntregaNombre] = useState('')
  const [recibeNombre, setRecibeNombre] = useState('')
  const [productos, setProductos] = useState([{ nombre: '', cantidad: '', unidad: '' }])
  const [sugerencias, setSugerencias] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    getWarehouses().then(data => {
      setAlmacenes(data)
      if (!isAdmin && warehouseId) setOrigenId(String(warehouseId))
    }).catch(console.error)
  }, [isAdmin, warehouseId])

  function buscarProductos(idx, query) {
    const updated = [...productos]
    updated[idx].nombre = query
    setProductos(updated)
    setProductoActivo(idx)
    clearTimeout(debounceRef.current)
    if (query.length < 2) { setSugerencias([]); return }
    debounceRef.current = setTimeout(async () => {
      const results = await getProductos(query)
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

    if (!origenId || !destinoId) return setError('Selecciona almacén de origen y destino')
    if (origenId === destinoId) return setError('Origen y destino no pueden ser el mismo')
    const productosValidos = productos.filter(p => p.nombre.trim() && p.cantidad)
    if (productosValidos.length === 0) return setError('Agrega al menos un producto con cantidad')

    setLoading(true)
    try {
      const transferencia = {
        origen_id: parseInt(origenId),
        destino_id: parseInt(destinoId),
        entrega_nombre: entregaNombre.trim(),
        recibe_nombre: recibeNombre.trim(),
        fecha_hora: new Date().toISOString(),
        estado: 'pendiente',
      }

      if (isOffline) {
        await guardarTransferenciaPendiente({ ...transferencia, productos: productosValidos })
        navigate('/')
        return
      }

      const created = await createTransferencia(transferencia)

      const { error: errProd } = await supabase.from('transferencia_productos').insert(
        productosValidos.map(p => ({
          transferencia_id: created.id,
          producto: p.nombre.trim(),
          cantidad: parseFloat(p.cantidad),
          unidad: p.unidad.trim() || ''
        }))
      )
      if (errProd) throw new Error('Transferencia creada pero hubo un error al guardar los productos: ' + errProd.message)

      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al crear la transferencia')
    } finally {
      setLoading(false)
    }
  }

  const almacenesDestino = almacenes.filter(a => String(a.id) !== origenId)
  const origenNombre = almacenes.find(a => String(a.id) === origenId)?.nombre
  const productosValidos = productos.filter(p => p.nombre.trim() && p.cantidad).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4 pt-6">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Nueva Transferencia</h1>
        </div>
        <p className="text-blue-200 text-xs ml-8">
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
              <ChevronRight className="w-4 h-4 text-gray-300" />
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
              <input
                type="text"
                value={entregaNombre}
                onChange={e => setEntregaNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Quien recibe</label>
              <input
                type="text"
                value={recibeNombre}
                onChange={e => setRecibeNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Nombre completo"
              />
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
                {/* Fila: búsqueda + eliminar */}
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
                  {productoActivo === idx && sugerencias.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {sugerencias.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => seleccionarProducto(idx, s)}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="font-medium">{s.nombre}</span>
                          {s.unidad_medida && <span className="text-gray-400 text-xs">{s.unidad_medida}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fila: cantidad + unidad */}
                <div className="grid grid-cols-2 gap-2">
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
