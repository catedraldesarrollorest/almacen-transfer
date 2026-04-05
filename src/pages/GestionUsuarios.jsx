import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Save, Trash2, User } from 'lucide-react'
import { supabase, getWarehouses } from '../lib/supabase'

export default function GestionUsuarios() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState({
    email: '', password: '', nombre: '', rol: 'operador', warehouse_id: ''
  })
  const [creando, setCreando] = useState(false)
  const [errCrear, setErrCrear] = useState('')

  useEffect(() => {
    Promise.all([loadUsuarios(), getWarehouses().then(setAlmacenes)])
  }, [])

  async function loadUsuarios() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*, warehouse:warehouse_id(nombre)')
        .order('created_at', { ascending: false })
      if (!err && data) setUsuarios(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardar(usuario) {
    setSaving(usuario.id)
    setError('')
    try {
      const { error: err } = await supabase
        .from('users')
        .update({ rol: usuario.rol, warehouse_id: usuario.warehouse_id || null, nombre: usuario.nombre })
        .eq('id', usuario.id)
      if (err) throw err
      await loadUsuarios()
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  function actualizarLocal(id, campo, valor) {
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, [campo]: valor } : u))
  }

  async function handleCrearUsuario(e) {
    e.preventDefault()
    setErrCrear('')
    setCreando(true)
    try {
      // Crear usuario en auth
      const { data, error: errAuth } = await supabase.auth.signUp({
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
      })
      if (errAuth) throw errAuth

      const userId = data.user?.id
      if (!userId) throw new Error('No se pudo obtener el ID del usuario')

      // Insertar en tabla users con rol y almacén
      const { error: errUser } = await supabase.from('users').upsert({
        id: userId,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
        warehouse_id: nuevoUsuario.warehouse_id || null,
      })
      if (errUser) throw errUser

      setNuevoUsuario({ email: '', password: '', nombre: '', rol: 'operador', warehouse_id: '' })
      setShowForm(false)
      await loadUsuarios()
    } catch (e) {
      setErrCrear(e.message || 'Error al crear usuario')
    } finally {
      setCreando(false)
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
            <h1 className="text-xl font-bold text-gray-900">Gestionar Usuarios</h1>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setErrCrear('') }}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Formulario nuevo usuario */}
        {showForm && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/20">
            <h2 className="font-semibold text-gray-900 mb-3">Nuevo usuario</h2>
            {errCrear && (
              <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3 mb-3">
                {errCrear}
              </div>
            )}
            <form onSubmit={handleCrearUsuario} className="space-y-3">
              <input
                type="text"
                value={nuevoUsuario.nombre}
                onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Nombre completo"
                required
              />
              <input
                type="email"
                value={nuevoUsuario.email}
                onChange={e => setNuevoUsuario(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Email"
                required
              />
              <input
                type="password"
                value={nuevoUsuario.password}
                onChange={e => setNuevoUsuario(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Contraseña (mínimo 6 caracteres)"
                minLength={6}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={nuevoUsuario.rol}
                  onChange={e => setNuevoUsuario(p => ({ ...p, rol: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="operador">Operador</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={nuevoUsuario.warehouse_id}
                  onChange={e => setNuevoUsuario(p => ({ ...p, warehouse_id: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Sin almacén</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creando}
                  className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {creando ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de usuarios */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {usuarios.map(u => (
              <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{u.nombre || u.email}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    u.rol === 'admin' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.rol}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select
                    value={u.rol || 'operador'}
                    onChange={e => actualizarLocal(u.id, 'rol', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="operador">Operador</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={u.warehouse_id || ''}
                    onChange={e => actualizarLocal(u.id, 'warehouse_id', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">Sin almacén</option>
                    {almacenes.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleGuardar(u)}
                  disabled={saving === u.id}
                  className="w-full bg-primary/10 text-primary rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving === u.id ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
