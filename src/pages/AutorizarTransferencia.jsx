import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, CheckCircle, Package, XCircle, KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function AutorizarTransferencia() {
  const navigate = useNavigate()
  const { user, warehouseId } = useAuth()
  const scannerRef = useRef(null)
  const scannerInstance = useRef(null)

  const [modo, setModo] = useState('scan') // 'scan' | 'manual' | 'detalle' | 'success'
  const [codigoManual, setCodigoManual] = useState('')
  const [transferencia, setTransferencia] = useState(null)
  const [productos, setProductos] = useState([])
  const [pin, setPin] = useState('')
  const [loadingBuscar, setLoadingBuscar] = useState(false)
  const [loadingAutorizar, setLoadingAutorizar] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let scanner = null

    async function initScanner() {
      if (modo !== 'scan' || !scannerRef.current) return
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode')
        scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false)
        scannerInstance.current = scanner
        scanner.render(
          (decoded) => {
            scanner.clear().catch(() => {})
            scannerInstance.current = null
            buscarTransferencia(decoded)
          },
          () => {}
        )
      } catch (e) {
        console.error('Error al iniciar escáner:', e)
      }
    }

    initScanner()

    return () => {
      if (scannerInstance.current) {
        scannerInstance.current.clear().catch(() => {})
        scannerInstance.current = null
      }
    }
  }, [modo])

  async function buscarTransferencia(codigo) {
    setError('')
    setLoadingBuscar(true)
    try {
      const { data, error: err } = await supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(id, nombre, pin)')
        .eq('codigo_qr', codigo.trim())
        .single()

      if (err || !data) {
        setError('Transferencia no encontrada. Verifica el código.')
        setModo('scan')
        return
      }
      if (data.estado !== 'pendiente') {
        setError(`Esta transferencia ya está ${data.estado}.`)
        setModo('scan')
        return
      }

      const { data: prods } = await supabase
        .from('transferencia_productos')
        .select('*')
        .eq('transferencia_id', data.id)

      setTransferencia(data)
      setProductos(prods || [])
      setPin('')
      setModo('detalle')
    } catch (e) {
      setError(e.message || 'Error al buscar la transferencia')
      setModo('scan')
    } finally {
      setLoadingBuscar(false)
    }
  }

  async function handleAutorizar(e) {
    e.preventDefault()
    setError('')

    // Verificar PIN del almacén destino
    const pinDestino = transferencia?.destino?.pin
    if (!pinDestino) {
      setError('Este almacén no tiene PIN configurado. Contacta al administrador.')
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
        .update({
          estado: 'completado',
          fecha_autorizacion: new Date().toISOString()
        })
        .eq('id', transferencia.id)

      if (err) throw err
      setModo('success')
    } catch (e) {
      setError(e.message || 'Error al autorizar la transferencia')
    } finally {
      setLoadingAutorizar(false)
    }
  }

  function reiniciar() {
    setModo('scan')
    setTransferencia(null)
    setProductos([])
    setPin('')
    setCodigoManual('')
    setError('')
  }

  // --- PANTALLA ÉXITO ---
  if (modo === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">¡Autorizado!</h1>
          <p className="text-gray-500 mt-2 mb-6">Transferencia completada exitosamente</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reiniciar} className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold text-sm">
              Otra transferencia
            </button>
            <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm">
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => { reiniciar(); navigate('/') }} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Autorizar Transferencia</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ESCANEAR / MANUAL */}
        {(modo === 'scan' || modo === 'manual') && (
          <>
            {modo === 'scan' && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  Escanear QR de la transferencia
                </h2>
                <div id="qr-reader" ref={scannerRef} className="w-full rounded-lg overflow-hidden"></div>
              </div>
            )}

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="mx-4 text-sm text-gray-400">o</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {modo === 'scan' ? (
              <button
                onClick={() => setModo('manual')}
                className="w-full bg-white border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Ingresar código manualmente
              </button>
            ) : (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <h2 className="font-semibold text-gray-900">Código de transferencia</h2>
                <input
                  type="text"
                  value={codigoManual}
                  onChange={e => setCodigoManual(e.target.value.toUpperCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="TR-0000000000-0000"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setModo('scan'); setCodigoManual('') }}
                    className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => buscarTransferencia(codigoManual)}
                    disabled={!codigoManual.trim() || loadingBuscar}
                    className="flex-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                  >
                    {loadingBuscar ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* DETALLE + PIN */}
        {modo === 'detalle' && transferencia && (
          <div className="space-y-4">
            {/* Detalle de la transferencia */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Detalle de transferencia</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Origen</span>
                  <span className="font-medium">{transferencia.origen?.nombre}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Destino</span>
                  <span className="font-medium">{transferencia.destino?.nombre}</span>
                </div>
                {transferencia.entrega_nombre && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Entrega</span>
                    <span className="font-medium">{transferencia.entrega_nombre}</span>
                  </div>
                )}
                {transferencia.recibe_nombre && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Recibe</span>
                    <span className="font-medium">{transferencia.recibe_nombre}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Código</span>
                  <span className="font-mono text-xs text-gray-600">{transferencia.codigo_qr}</span>
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

            {/* PIN del almacén destino */}
            <form onSubmit={handleAutorizar} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">
                  PIN del almacén <span className="text-primary">{transferencia.destino?.nombre}</span>
                </h3>
              </div>
              <p className="text-sm text-gray-500">
                Ingresa el PIN del almacén destino para confirmar la recepción.
              </p>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={e => { setPin(e.target.value); setError('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••"
                autoFocus
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={reiniciar}
                  className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!pin || loadingAutorizar}
                  className="flex-1 bg-success text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {loadingAutorizar ? 'Autorizando...' : 'Confirmar recepción'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
