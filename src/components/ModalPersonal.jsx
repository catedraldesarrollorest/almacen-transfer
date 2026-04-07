import { useState, useEffect } from 'react'
import { X, Plus, Trash2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ModalPersonal({ almacenId, almacenNombre, onClose }) {
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCargo, setNewCargo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    console.log('ModalPersonal - almacenId:', almacenId, 'tipo:', typeof almacenId)
    const idNumerico = parseInt(almacenId, 10)
    if (!isNaN(idNumerico) && idNumerico > 0) {
      cargarPersonal(idNumerico)
    } else {
      console.error('almacenId inválido:', almacenId)
      setLoading(false)
    }
  }, [almacenId])

  async function cargarPersonal(idNumerico) {
    setLoading(true)
    console.log('Cargando personal para almacen ID:', idNumerico)
    try {
      const { data, error } = await supabase
        .from('personal_almacen')
        .select('*')
        .eq('almacen_id', idNumerico)
        .order('nombre')

      console.log('Respuesta Supabase - data:', data, 'error:', error, 'count:', data?.length)
      
      if (error) {
        console.error('Error Supabase:', error)
        throw error
      }
      setPersonal(data || [])
    } catch (err) {
      console.error('Error cargando personal:', err)
      setPersonal([])
    } finally {
      setLoading(false)
    }
  }

  async function agregarPersona(e) {
    e.preventDefault()
    if (!newName.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('personal_almacen')
        .insert([{
          almacen_id: parseInt(almacenId, 10),
          nombre: newName.trim(),
          cargo: newCargo.trim() || null
        }])

      if (error) throw error
      setNewName('')
      setNewCargo('')
      cargarPersonal()
    } catch (err) {
      alert('Error al agregar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function eliminarPersona(id) {
    if (!confirm('¿Eliminar esta persona?')) return
    try {
      await supabase.from('personal_almacen').delete().eq('id', id)
      cargarPersonal()
    } catch (err) {
      alert('Error al eliminar')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Personal</h2>
            <p className="text-sm text-gray-500">{almacenNombre}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Agregar nuevo */}
          <form onSubmit={agregarPersona} className="bg-gray-50 rounded-xl p-3 space-y-3">
            <p className="text-sm font-medium text-gray-700">Agregar persona</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Nombre"
                required
              />
              <input
                type="text"
                value={newCargo}
                onChange={e => setNewCargo(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Cargo (opcional)"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </form>

          {/* Lista de personal */}
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : personal.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay personal registrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {personal.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-gray-900">{p.nombre}</p>
                    {p.cargo && <p className="text-xs text-gray-500">{p.cargo}</p>}
                  </div>
                  <button
                    onClick={() => eliminarPersona(p.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}