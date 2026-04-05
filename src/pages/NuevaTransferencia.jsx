import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getWarehouses, getProductos, createTransferencia } from '../lib/supabase'
import { guardarTransferenciaPendiente } from '../lib/offlineDB'
import { useOffline } from '../contexts/OfflineContext'
import QRCode from 'qrcode'

export default function NuevaTransferencia() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOffline } = useOffline()

  const [almacenes, setAlmacenes] = useState([])
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [entregaNombre, setEntregaNombre] = useState('')
  const [recibeNombre, setRecibeNombre] = useState('')
  const [productos, setProductos] = useState([{ nombre: '', cantidad: '', unidad: '' }])
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getWarehouses().then(setAlmacenes).catch(console.error)
  }, [])

  async function buscarProductos(idx, query) {
    const updated = [...productos]
    updated[idx].nombre = query
    setProductos(updated)
    setProductoActivo(idx)

    if (query.length < 2) {
      setSugerencias([])
      return
    }
    const results = await getProductos(query)
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
        origen_id: origenId,
        destino_id: destinoId,
        entrega_nombre: entregaNombre,
        recibe_nombre: recibeNombre,
        fecha_hora: new Date().toISOString(),
        estado: 'pendiente',
      }

      if (isOffline) {
        await guardarTransferenciaPendiente({ ...transferencia, productos: productosValidos })
        navigate('/')
        return
      }

      const created = await createTransferencia(transferencia)

      // Guardar productos
      if (productosValidos.length > 0) {
        await supabase.from('transferencia_productos').insert(
          productosValidos.map(p => ({
            transferencia_id: created.id,
            producto: p.nombre,
            cantidad: parseFloat(p.cantidad),
            unidad: p.unidad
          }))
        )
      }

      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al crear la transferencia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div>
            <label className="block text-sm text-gray-600 mb-1">Origen</label>
            <select
              value={origenId}
              onChange={(e) => setOrigenId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Seleccionar almacén</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Destino</label>
            <select
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Seleccionar almacén</option>
              {almacenes.filter(a => a.id !== origenId).map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsables */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Responsables</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Entrega</label>
            <input
              type="text"
              value={entregaNombre}
              onChange={(e) => setEntregaNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Nombre de quien entrega"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Recibe</label>
            <input
              type="text"
              value={recibeNombre}
              onChange={(e) => setRecibeNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Nombre de quien recibe"
            />
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Productos</h2>
          <div className="space-y-3">
            {productos.map((prod, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                    <input
                      type="text"
                      value={prod.nombre}
                      onChange={(e) => buscarProductos(idx, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Buscar producto..."
                    />
                  </div>
                  {productoActivo === idx && sugerencias.length > 0 && (
                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {sugerencias.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => seleccionarProducto(idx, s)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          {s.nombre}
                          {s.unidad_medida && <span className="text-gray-400 ml-1">({s.unidad_medida})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={prod.cantidad}
                    onChange={(e) => actualizarProducto(idx, 'cantidad', e.target.value)}
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Cantidad"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="text"
                    value={prod.unidad}
                    onChange={(e) => actualizarProducto(idx, 'unidad', e.target.value)}
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Unidad (kg, lt...)"
                  />
                  {productos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarProducto(idx)}
                      className="p-2 text-error hover:bg-red-50 rounded-lg"
                    >
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
