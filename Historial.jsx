import { openDB } from 'idb'

const DB_NAME = 'almacen-transfer-db'
const DB_VERSION = 1

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Almacenes
      if (!db.objectStoreNames.contains('warehouses')) {
        db.createObjectStore('warehouses', { keyPath: 'id' })
      }
      
      // Transferencias pendientes de sincronizar
      if (!db.objectStoreNames.contains('transferencias_pendientes')) {
        db.createObjectStore('transferencias_pendientes', { 
          keyPath: 'id',
          autoIncrement: true 
        })
      }
      
      // Productos cacheados
      if (!db.objectStoreNames.contains('productos')) {
        db.createObjectStore('productos', { keyPath: 'id' })
      }
      
      // Historial local
      if (!db.objectStoreNames.contains('historial')) {
        db.createObjectStore('historial', { 
          keyPath: 'id',
          autoIncrement: true 
        })
      }
    }
  })
}

// Guardar transferencia pendiente
export async function guardarTransferenciaPendiente(transferencia) {
  const db = await initDB()
  return db.add('transferencias_pendientes', {
    ...transferencia,
    creado_offline: true,
    timestamp: Date.now()
  })
}

// Obtener transferencias pendientes
export async function getTransferenciasPendientes() {
  const db = await initDB()
  return db.getAll('transferencias_pendientes')
}

// Eliminar transferencia sincronizada
export async function eliminarTransferenciaPendiente(id) {
  const db = await initDB()
  return db.delete('transferencias_pendientes', id)
}

// Cachear productos
export async function cachearProductos(productos) {
  const db = await initDB()
  const tx = db.transaction('productos', 'readwrite')
  for (const producto of productos) {
    tx.store.put(producto)
  }
  await tx.done
}

// Buscar productos en cache
export async function buscarProductosCache(query) {
  const db = await initDB()
  const productos = await db.getAll('productos')
  if (!query) return productos
  return productos.filter(p => 
    p.nombre.toLowerCase().includes(query.toLowerCase())
  )
}

// Guardar en historial local
export async function guardarHistorialLocal(transferencia) {
  const db = await initDB()
  return db.add('historial', {
    ...transferencia,
    timestamp: Date.now()
  })
}

// Obtener historial local
export async function getHistorialLocal() {
  const db = await initDB()
  return db.getAll('historial')
}