import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Warehouses
export async function getWarehouses() {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return data
}

// Transferencias
export async function createTransferencia(transferencia) {
  const { data, error } = await supabase
    .from('transferencias')
    .insert([transferencia])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTransferenciasPendientes(warehouseId) {
  const { data, error } = await supabase
    .from('transferencias')
    .select('*, origen:origen_id(nombre), destino:destino_id(nombre)')
    .eq('destino_id', warehouseId)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function autorizarTransferencia(id, userId) {
  const { data, error } = await supabase
    .from('transferencias')
    .update({
      estado: 'completado',
      autorizado_por: userId,
      fecha_autorizacion: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Productos
export async function getProductos(search = '') {
  let query = supabase
    .from('productos_base')
    .select('*')
    .order('nombre')

  if (search) {
    query = query.ilike('nombre', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}
