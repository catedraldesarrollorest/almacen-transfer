import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, createTransferenciaConProductos, getWarehouses, getPersonal, getProductos } from '../lib/supabase'
import {
  getTransferenciasPendientes,
  eliminarTransferenciaPendiente,
  cachearWarehouses,
  cachearPersonal,
  cachearProductos
} from '../lib/offlineDB'

const OfflineContext = createContext({})

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      syncPendientes()
      syncCatalogs()
    }
    function handleOffline() {
      setIsOffline(true)
    }

    if (navigator.onLine) {
      syncCatalogs()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function syncCatalogs() {
    try {
      const warehouses = await getWarehouses()
      if (warehouses) await cachearWarehouses(warehouses)
      
      const personalData = await getPersonal()
      if (personalData) await cachearPersonal(personalData)
      
      const productosData = await getProductos()
      if (productosData) await cachearProductos(productosData)
      
      console.log('Catálogos sincronizados en background')
    } catch (e) {
      console.error('Error sincronizando catálogos:', e)
    }
  }

  async function syncPendientes() {
    setSyncing(true)
    try {
      const pendientes = await getTransferenciasPendientes()
      for (const t of pendientes) {
        try {
          const { productos, id, creado_offline, timestamp, ...transferencia } = t
          
          const productosProcesados = productos.map(p => ({
            nombre: p.nombre,
            cantidad: parseFloat(p.cantidad),
            unidad: p.unidad
          }))

          await createTransferenciaConProductos(transferencia, productosProcesados)
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
