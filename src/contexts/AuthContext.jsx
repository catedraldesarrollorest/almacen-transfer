import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '940209'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null) // { rol, warehouseId, warehouseName }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar sesión guardada
    try {
      const stored = localStorage.getItem('almacen_session')
      if (stored) setSession(JSON.parse(stored))
    } catch {
      localStorage.removeItem('almacen_session')
    }
    setLoading(false)
  }, [])

  async function signIn(pin) {
    const pinStr = String(pin).trim()

    // PIN de administrador
    if (pinStr === ADMIN_PIN) {
      const s = { rol: 'admin', warehouseId: null, warehouseName: 'Admin' }
      localStorage.setItem('almacen_session', JSON.stringify(s))
      setSession(s)
      return
    }

    // PIN de almacén
    const { data, error } = await supabase
      .from('warehouses')
      .select('id, nombre')
      .eq('pin', pinStr)
      .eq('activo', true)
      .single()

    if (error || !data) throw new Error('PIN incorrecto')

    const s = { rol: 'operador', warehouseId: data.id, warehouseName: data.nombre }
    localStorage.setItem('almacen_session', JSON.stringify(s))
    setSession(s)
  }

  function signOut() {
    localStorage.removeItem('almacen_session')
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{
      user: session,
      isAdmin: session?.rol === 'admin',
      warehouseId: session?.warehouseId ?? null,
      warehouseName: session?.warehouseName ?? null,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
