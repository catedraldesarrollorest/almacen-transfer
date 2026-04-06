import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, X, QrCode } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ModalQR from '../components/ModalQR'

export default function GestionAlmacenes() {
  const navigate = useNavigate()
  const [almacenes, setAlmacenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'entrada_salida',
    pin: '',
    activo: true,
    qr_secret: ''
  })

  useEffect(() => {
    cargarAlmacenes()
  }, [])

  const cargarAlmacenes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      setAlmacenes(data || [])
    } catch (err) {
      console.error('Error cargando almacenes:', err)
    } finally {
      setLoading(false)
    }
  }

  const abrirNuevo = () => {
    setEditing(null)
    setForm({
      nombre: '',
      tipo: 'entrada_salida',
      pin: '',
      activo: true,
      qr_secret: generateQRSecret()
    })
    setError('')
    setModalOpen(true)
  }

  const abrirEditar = (almacen) => {
    setEditing(almacen)
    setForm({
      nombre: almacen.nombre,
      tipo: almacen.tipo || 'entrada_salida',
      pin: almacen.pin || '',
      activo: almacen.activo !== false,
      qr_secret: almacen.qr_secret || generateQRSecret()
    })
    setError('')
    setModalOpen(true)
  }

  const generateQRSecret = () => {
    return crypto.randomUUID()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (!editing && (!form.pin || form.pin.length < 4)) {
      setError('El PIN debe tener al menos 4 dígitos')
      return
    }

    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        pin: form.pin || null,
        activo: form.activo,
        qr_secret: form.qr_secret,
        responsable: form.responsable || null
      }

      let result
      if (editing) {
        result = await supabase
          .from('warehouses')
          .update(payload)
          .eq('id', editing.id)
      } else {
        result = await supabase
          .from('warehouses')
          .insert([payload])
      }

      if (result.error) throw result.error

      setModalOpen(false)
      cargarAlmacenes()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const eliminarAlmacen = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este almacén?')) return

    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id)

      if (error) throw error
      cargarAlmacenes()
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  const toggleActivo = async (almacen) => {
    try {
      await supabase
        .from('warehouses')
        .update({ activo: !almacen.activo })
        .eq('id', almacen.id)

      cargarAlmacenes()
    } catch (err) {
      alert('Error al actualizar estado')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Almacenes</h1>
          </div>
          <button
            onClick={abrirNuevo}
            className="bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : almacenes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay almacenes creados</p>
            <button onClick={abrirNuevo} className="text-primary mt-2 underline">
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {almacenes.map((a) => (
              <div
                key={a.id}
                className={`bg-white rounded-xl p-4 shadow-sm ${
                  a.activo === false ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{a.nombre}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          a.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 space-y-1">
                      <p>Tipo: {a.tipo === 'entrada_salida' ? 'Entrada y Salida' : 'Solo Salida'}</p>
                      {a.pin && <p className="font-mono">PIN: {a.pin}</p>}
                      {a.qr_secret && (
                        <p className="text-xs text-gray-400">QR: {a.qr_secret.substring(0, 8)}...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => { setAlmacenSeleccionado(a); setQrModalOpen(true); }}
                      className="p-2 text-purple-600 bg-purple-50 rounded-lg"
                      title="Ver QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => abrirEditar(a)}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => eliminarAlmacen(a.id)}
                      className="p-2 text-red-600 bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Editar Almacén' : 'Nuevo Almacén'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nombre del almacén"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="entrada_salida">Entrada y Salida</option>
                  <option value="solo_salida">Solo Salida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN (4-6 dígitos)
                </label>
                <input
                  type="text"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                  placeholder="Código PIN"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este PIN se usará para autorizar transferencias
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable
                </label>
                <input
                  type="text"
                  value={form.responsable || ''}
                  onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nombre del responsable"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código QR Secret
                </label>
                <input
                  type="text"
                  value={form.qr_secret}
                  onChange={(e) => setForm({ ...form, qr_secret: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono bg-gray-50 text-gray-600"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código único para escanear y autorizar
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-gray-300"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  Almacén activo
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Almacén'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal QR */}
      {qrModalOpen && (
        <ModalQR 
          almacen={almacenSeleccionado} 
          onClose={() => { setQrModalOpen(false); setAlmacenSeleccionado(null); }}
        />
      )}
    </div>
  )
}