import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, createTransferencia } from '../lib/supabase'
import {
  getTransferenciasPendientes,
  eliminarTransferenciaPendiente
} from '../lib/offlineDB'

const OfflineContext = createContext({})

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(false) // assume online; events + ping will correct this
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    // Set initial state from navigator, then verify with a real ping
    if (!navigator.onLine) setIsOffline(true)

    async function verifyConnectivity() {
      try {
        await supabase.from('warehouses').select('id').limit(1)
        setIsOffline(false)
      } catch {
        setIsOffline(true)
      }
    }
    verifyConnectivity()
    function handleOnline() {
      setIsOffline(false)
      syncPendientes()
    }
    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function syncPendientes() {
    setSyncing(true)
    try {
      const pendientes = await getTransferenciasPendientes()
      for (const t of pendientes) {
        try {
          const { productos, id, creado_offline, timestamp, ...transferencia } = t
          const created = await createTransferencia(transferencia)
          if (productos?.length) {
            await supabase.from('transferencia_productos').insert(
              productos.map(p => ({
                transferencia_id: created.id,
                producto: p.nombre,
                cantidad: parseFloat(p.cantidad),
                unidad: p.unidad
              }))
            )
          }
          await eliminarTransferenciaPendiente(t.id)
        } catch (e) {
          console.error('Error sincronizando transferencia:', e)
        }
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <OfflineContext.Provider value={{ isOffline, syncing, syncPendientes }}>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-xs text-center py-1 z-50">
          Sin conexión — los cambios se guardarán localmente
        </div>
      )}
      {children}
    </OfflineContext.Provider>
  )
}

export const useOffline = () => useContext(OfflineContext)
