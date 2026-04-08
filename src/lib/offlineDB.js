import { openDB } from 'idb'

const DB_NAME = 'almacen-transfer-db'
const DB_VERSION = 2

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Personal
      if (!db.objectStoreNames.contains('personal')) {
        db.createObjectStore('personal', { keyPath: 'id' })
      }
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

// ----- NUEVOS MÉTODOS DE CACHÉ PARA CATÁLOGOS -----

// Cachear Almacenes
export async function cachearWarehouses(warehouses) {
  const db = await initDB()
  const tx = db.transaction('warehouses', 'readwrite')
  for (const w of warehouses) {
    tx.store.put(w)
  }
  await tx.done
}

// Obtener Almacenes Cacheados
export async function getWarehousesCache() {
  const db = await initDB()
  return db.getAll('warehouses')
}

// Cachear Personal
export async function cachearPersonal(personalData) {
  const db = await initDB()
  const tx = db.transaction('personal', 'readwrite')
  for (const p of personalData) {
    tx.store.put(p)
  }
  await tx.done
}

// Obtener Personal Cacheado por Almacén
export async function getPersonalCache(almacenId) {
  const db = await initDB()
  const allPersonal = await db.getAll('personal')
  if (!almacenId) return allPersonal
  return allPersonal.filter(p => String(p.almacen_id) === String(almacenId))
}
