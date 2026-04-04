import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, CheckCircle, Package, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, autorizarTransferencia } from '../lib/supabase'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function AutorizarTransferencia() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const scannerRef = useRef(null)
  const scannerInstance = useRef(null)

  const [modo, setModo] = useState('scan') // 'scan' | 'manual' | 'resultado'
  const [codigoManual, setCodigoManual] = useState('')
  const [transferencia, setTransferencia] = useState(null)
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (modo === 'scan' && scannerRef.current && !scannerInstance.current) {
      scannerInstance.current = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: 250,
      })
      scannerInstance.current.render(
        (decodedText) => {
          buscarTransferencia(decodedText)
          scannerInstance.current.clear()
          scannerInstance.current = null
        },
        (err) => {}
      )
    }
    return () => {
      if (scannerInstance.current) {
        scannerInstance.current.clear().catch(() => {})
        scannerInstance.current = null
      }
    }
  }, [modo])

  async function buscarTransferencia(codigo) {
    setError('')
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('transferencias')
        .select('*, origen:origen_id(nombre), destino:destino_id(nombre)')
        .eq('codigo_qr', codigo)
        .single()

      if (err || !data) {
        setError('Transferencia no encontrada')
        return
      }
      if (data.estado !== 'pendiente') {
        setError(`Esta transferencia ya está ${data.estado}`)
        return
      }

      const { data: prods } = await supabase
        .from('transferencia_productos')
        .select('*')
        .eq('transferencia_id', data.id)

      setTransferencia(data)
      setProductos(prods || [])
      setModo('resultado')
    } catch (e) {
      setError(e.message || 'Error al buscar la transferencia')
    } finally {
      setLoading(false)
    }
  }

  async function handleAutorizar() {
    setLoading(true)
    setError('')
    try {
      await autorizarTransferencia(transferencia.id, user?.id)
      setSuccess(true)
    } catch (e) {
      setError(e.message || 'Error al autorizar')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">¡Autorizado!</h1>
          <p className="text-gray-500 mt-2 mb-6">Transferencia completada exitosamente</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-8 py-3 rounded-xl font-semibold"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Autorizar Transferencia</h1>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3 mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {modo === 'scan' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Escanear QR
              </h2>
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="mx-4 text-sm text-gray-400">o</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              onClick={() => setModo('manual')}
              className="w-full bg-white border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Ingresar código manualmente
            </button>
          </div>
        )}

        {modo === 'manual' && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Código de transferencia</h2>
            <input
              type="text"
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="TRF-XXXXXXXXX"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModo('scan')}
                className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => buscarTransferencia(codigoManual)}
                disabled={!codigoManual || loading}
                className="flex-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        )}

        {modo === 'resultado' && transferencia && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Detalle de transferencia</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Origen</span>
                  <span className="font-medium">{transferencia.origen?.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destino</span>
                  <span className="font-medium">{transferencia.destino?.nombre}</span>
                </div>
                {transferencia.entrega_nombre && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entrega</span>
                    <span className="font-medium">{transferencia.entrega_nombre}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium">
                    {new Date(transferencia.fecha_hora).toLocaleString('es')}
                  </span>
                </div>
              </div>
            </div>

            {productos.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
                <div className="space-y-2">
                  {productos.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-800">{p.producto}</span>
                      <span className="font-medium text-gray-900">{p.cantidad} {p.unidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setModo('scan'); setTransferencia(null) }}
                className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleAutorizar}
                disabled={loading}
                className="flex-1 bg-success text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              >
                {loading ? 'Autorizando...' : 'Autorizar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
