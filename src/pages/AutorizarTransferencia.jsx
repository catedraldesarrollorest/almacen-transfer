import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, KeyRound, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function AutorizarTransferencia() {
  const navigate = useNavigate()
  const { user, warehouseId, isAdmin } = useAuth()
  
  const successTimerRef = useRef(null)
  const [transferenciasPendientes, setTransferenciasPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null)
  const [productos, setProductos] = useState([])
  const [pin, setPin] = useState('')
  const [loadingAutorizar, setLoadingAutorizar] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Cargar transferencias pendientes
  // Admin: carga todas. Operador: espera a tener su warehouseId.
  useEffect(() => {
    if (isAdmin || warehouseId) {
      cargarTransferenciasPendientes()
    }
  }, [warehouseId, isAdmin])

  async function cargarTransferenciasPendientes() {
    setLoading(true)
    try {
      let query = supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(nombre)')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })

      if (!isAdmin) {
        query = query.eq('destino_id', warehouseId)
      }

      const { data, error } = await query

      if (error) throw error
      setTransferenciasPendientes(data || [])
    } catch (err) {
      console.error('Error cargando transferencias:', err)
    } finally {
      setLoading(false)
    }
  }

  async function seleccionarTransferencia(transferencia) {
    setError('')
    setPin('')
    setTransferenciaSeleccionada(transferencia)
    
    try {
      const { data, error } = await supabase
        .from('transferencia_productos')
        .select('*')
        .eq('transferencia_id', transferencia.id)
      
      if (error) throw error
      setProductos(data || [])
    } catch (err) {
      console.error('Error cargando productos:', err)
      setProductos([])
    }
  }

  async function handleAutorizar(e) {
    e.preventDefault()
    setError('')

    if (!transferenciaSeleccionada) return

    // Verificar PIN del almacén DESTINO (no del usuario logueado)
    const { data: almacen } = await supabase
      .from('warehouses')
      .select('pin')
      .eq('id', transferenciaSeleccionada.destino_id)
      .single()

    const pinDestino = almacen?.pin
    if (!pinDestino) {
      setError('Este almacén no tiene PIN configurado.')
      return
    }
    if (pin !== String(pinDestino)) {
      setError('PIN incorrecto. Inténtalo de nuevo.')
      setPin('')
      return
    }

    setLoadingAutorizar(true)
    try {
      const { error: err } = await supabase
        .from('transferencias')
        .update({ estado: 'completado' })
        .eq('id', transferenciaSeleccionada.id)

      if (err) throw err

      setSuccess(true)
    } catch (e) {
      setError(e.message || 'Error al autorizar')
    } finally {
      setLoadingAutorizar(false)
    }
  }

  async function handleEliminar() {
    if (!confirm('¿Estás seguro de cancelar esta transferencia? Esta acción no se puede deshacer.')) return
    
    setLoadingAutorizar(true)
    try {
      await supabase.from('transferencia_productos').delete().eq('transferencia_id', transferenciaSeleccionada.id)
      const { error: err } = await supabase.from('transferencias').delete().eq('id', transferenciaSeleccionada.id)
      
      if (err) throw err

      // Quitar inmediatamente de la lista local
      setTransferenciasPendientes(prev =>
        prev.filter(t => t.id !== transferenciaSeleccionada.id)
      )
      reiniciar()
    } catch (e) {
      setError(e.message || 'Error al eliminar')
    } finally {
      setLoadingAutorizar(false)
    }
  }

  function reiniciar() {
    setTransferenciaSeleccionada(null)
    setProductos([])
    setPin('')
    setError('')
    setSuccess(false)
    cargarTransferenciasPendientes()
  }

  // Auto-navegar al inicio 2 segundos después del éxito
  useEffect(() => {
    if (success) {
      successTimerRef.current = setTimeout(() => navigate('/'), 2000)
    }
    return () => clearTimeout(successTimerRef.current)
  }, [success])

  // PANTALLA ÉXITO
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">¡Autorizado!</h1>
          <p className="text-gray-500 mt-2 mb-6">Transferencia completada exitosamente</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-4xl mx-auto md:rounded-2xl md:shadow-sm md:overflow-hidden md:border border-gray-100">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {transferenciaSeleccionada ? 'Autorizar Transferencia' : 'Transferencias Pendientes'}
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* LISTA DE TRANSFERENCIAS PENDIENTES */}
        {!transferenciaSeleccionada && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : transferenciasPendientes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay transferencias pendientes</p>
                <p className="text-sm mt-1">No hay envíos para tu almacén</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">
                  Toca una transferencia para autorizarla:
                </p>
                {transferenciasPendientes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => seleccionarTransferencia(t)}
                    className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {isAdmin ? `${t.origen?.nombre} → ${t.destino?.nombre}` : `Desde: ${t.origen?.nombre}`}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {t.entrega_nombre && `Entrega: ${t.entrega_nombre}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(t.created_at).toLocaleString('es', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium">
                        Pendiente
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* DETALLE PARA AUTORIZAR */}
        {transferenciaSeleccionada && (
          <div className="space-y-4">
            <button
              onClick={() => setTransferenciaSeleccionada(null)}
              className="text-sm text-gray-500 flex items-center gap-1"
            >
              ← Volver a la lista
            </button>

            {/* Info de la transferencia */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Detalle</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Origen</span>
                  <span className="font-medium">{transferenciaSeleccionada.origen?.nombre}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Entrega</span>
                  <span className="font-medium">{transferenciaSeleccionada.entrega_nombre || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Recibe</span>
                  <span className="font-medium">{transferenciaSeleccionada.recibe_nombre || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Código</span>
                  <span className="font-mono text-xs text-gray-600">{transferenciaSeleccionada.codigo_qr}</span>
                </div>
              </div>
            </div>

            {/* Productos */}
            {productos.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
                <div className="space-y-1">
                  {productos.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-gray-800">{p.producto}</span>
                      <span className="font-medium text-gray-900">{p.cantidad} {p.unidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PIN */}
            <form onSubmit={handleAutorizar} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">Ingresa el PIN</h3>
              </div>
              <p className="text-sm text-gray-500">
                Ingresa el PIN de tu almacén para confirmar la recepción
              </p>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={!pin || loadingAutorizar}
                className="w-full bg-success text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              >
                {loadingAutorizar ? 'Autorizando...' : 'Confirmar Recepción'}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleEliminar}
                  disabled={loadingAutorizar}
                  className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-3 text-sm font-semibold disabled:opacity-60 mt-2"
                >
                  {loadingAutorizar ? 'Procesando...' : 'Eliminar / Rechazar Transferencia'}
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
