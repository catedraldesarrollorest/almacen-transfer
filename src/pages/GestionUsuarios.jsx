import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Save, Warehouse } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function GestionUsuarios() {
  const navigate = useNavigate()
  const [almacenes, setAlmacenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [pinsVisibles, setPinsVisibles] = useState({})
  const [pinsEdit, setPinsEdit] = useState({})
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    loadAlmacenes()
  }, [])

  async function loadAlmacenes() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('warehouses')
        .select('id, nombre, tipo, activo, pin')
        .order('id')
      if (!err && data) {
        setAlmacenes(data)
        const pins = {}
        data.forEach(a => { pins[a.id] = a.pin || '' })
        setPinsEdit(pins)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardarPin(almacen) {
    const nuevoPin = String(pinsEdit[almacen.id] || '').trim()
    if (!nuevoPin) { setError('El PIN no puede estar vacío'); return }
    if (nuevoPin.length < 4) { setError('El PIN debe tener al menos 4 dígitos'); return }

    setSaving(almacen.id)
    setError('')
    try {
      const { error: err } = await supabase
        .from('warehouses')
        .update({ pin: nuevoPin })
        .eq('id', almacen.id)
      if (err) throw err
      setSavedId(almacen.id)
      setTimeout(() => setSavedId(null), 2000)
      await loadAlmacenes()
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  function togglePin(id) {
    setPinsVisibles(p => ({ ...p, [id]: !p[id] }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">PINs de Almacenes</h1>
            <p className="text-xs text-gray-500">Los operadores usan estos PINs para entrar</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          almacenes.map(a => (
            <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Warehouse className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{a.nombre}</p>
                  <p className="text-xs text-gray-500">{a.tipo?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={pinsVisibles[a.id] ? 'text' : 'password'}
                    value={pinsEdit[a.id] || ''}
                    onChange={e => setPinsEdit(p => ({ ...p, [a.id]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono tracking-widest"
                    placeholder="PIN"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => togglePin(a.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {pinsVisibles[a.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => handleGuardarPin(a)}
                  disabled={saving === a.id}
                  className={`px-4 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition ${
                    savedId === a.id
                      ? 'bg-success text-white'
                      : 'bg-primary text-white disabled:opacity-60'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {saving === a.id ? '...' : savedId === a.id ? '✓' : 'Guardar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
