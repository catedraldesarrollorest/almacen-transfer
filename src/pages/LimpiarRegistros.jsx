import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Search, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LimpiarRegistros() {
  const navigate = useNavigate()

  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [preview, setPreview] = useState(null)   // { count, ids[] } | null
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handlePreview() {
    if (!fechaInicio || !fechaFin) {
      setError('Selecciona las dos fechas')
      return
    }
    if (fechaInicio > fechaFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin')
      return
    }
    setError('')
    setPreview(null)
    setDone(false)
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('transferencias')
        .select('id')
        .gte('created_at', `${fechaInicio}T00:00:00`)
        .lte('created_at', `${fechaFin}T23:59:59`)

      if (err) throw err
      setPreview({ count: data.length, ids: data.map(t => t.id) })
    } catch (e) {
      setError(e.message || 'Error al consultar registros')
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminar() {
    if (!preview?.ids?.length) return
    setDeleting(true)
    setError('')
    try {
      // Delete products first (FK constraint)
      const { error: e1 } = await supabase
        .from('transferencia_productos')
        .delete()
        .in('transferencia_id', preview.ids)
      if (e1) throw e1

      // Delete transfers
      const { error: e2 } = await supabase
        .from('transferencias')
        .delete()
        .in('id', preview.ids)
      if (e2) throw e2

      setDone(true)
      setPreview(null)
    } catch (e) {
      setError(e.message || 'Error al eliminar registros')
    } finally {
      setDeleting(false)
    }
  }

  function resetear() {
    setFechaInicio('')
    setFechaFin('')
    setPreview(null)
    setError('')
    setDone(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Limpiar Registros</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* Aviso */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Esta acción elimina permanentemente las transferencias y sus productos en el rango seleccionado. <strong>No se puede deshacer.</strong>
          </p>
        </div>

        {/* Rango de fechas */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Selecciona el rango a eliminar</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => { setFechaInicio(e.target.value); setPreview(null); setDone(false) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => { setFechaFin(e.target.value); setPreview(null); setDone(false) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <button
            onClick={handlePreview}
            disabled={loading || !fechaInicio || !fechaFin}
            className="w-full bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Consultando...' : 'Ver cuántos registros hay'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Preview resultado */}
        {preview !== null && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            {preview.count === 0 ? (
              <p className="text-center text-gray-500 text-sm py-2">
                No hay transferencias en ese rango de fechas.
              </p>
            ) : (
              <>
                <div className="text-center py-2">
                  <p className="text-4xl font-bold text-primary">{preview.count}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    transferencia{preview.count !== 1 ? 's' : ''} encontrada{preview.count !== 1 ? 's' : ''} entre<br />
                    <span className="font-medium text-gray-700">{fechaInicio}</span> y <span className="font-medium text-gray-700">{fechaFin}</span>
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
                  Se eliminarán <strong>{preview.count} transferencias</strong> y todos sus productos asociados de forma permanente.
                </div>

                <button
                  onClick={handleEliminar}
                  disabled={deleting}
                  className="w-full bg-primary text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Eliminando...' : `Eliminar ${preview.count} registro${preview.count !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        )}

        {/* Éxito */}
        {done && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-success mx-auto" />
            <p className="font-semibold text-green-800">Registros eliminados correctamente</p>
            <button
              onClick={resetear}
              className="text-sm text-primary underline"
            >
              Limpiar otro rango
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
