import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [warehouseId, setWarehouseId] = useState(null)

  useEffect(() => {
    // Cargar sesión inicial — await checkUserRole antes de quitar loading
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await checkUserRole(session.user.id)
      }
      setLoading(false)
    })

    // Escuchar cambios de sesión (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await checkUserRole(session.user.id)
        } else {
          setIsAdmin(false)
          setWarehouseId(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function checkUserRole(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('rol, warehouse_id')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setIsAdmin(data.rol === 'admin')
        setWarehouseId(data.warehouse_id ?? null)
        localStorage.setItem('user_info', JSON.stringify(data))
      }
    } catch (e) {
      console.error('Error al verificar rol:', e)
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    localStorage.removeItem('user_info')
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, warehouseId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
