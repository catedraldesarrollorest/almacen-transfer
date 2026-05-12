import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Boxes, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function InventarioAdmin() {
  const navigate = useNavigate()
  const [almacenesOrden, setAlmacenesOrden] = useState([])
  const [inventario, setInventario] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarInventario()
  }, [])

  async function cargarInventario() {
    setLoading(true)
    try {
      const { data: warehouses } = await supabase
        .from('warehouses')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')

      const almacenesConExistencia = (warehouses || []).filter(w => {
        const n = w.nombre.toLowerCase()
        return n.includes('central') || n.includes('ciudad libertad') || n.includes('copmar')
      })

      const resultados = {}

      for (const almacen of almacenesConExistencia) {
        const { data: transferencias } = await supabase
          .from('transferencias')
          .select('id')
          .eq('origen_id', almacen.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!transferencias?.length) {
          resultados[almacen.id] = { almacen, productos: [] }
          continue
        }

        const ids = transferencias.map(t => t.id)

        const { data: prods } = await supabase
          .from('transferencia_productos')
          .select('existencia, producto, unidad, transferencia_id')
          .in('transferencia_id', ids)
          .not('existencia', 'is', null)

        if (!prods?.length) {
          resultados[almacen.id] = { almacen, productos: [] }
          continue
        }

        // Por cada producto, quedarse con el registro de la transferencia más reciente
        const productoMap = {}
        prods.forEach(p => {
          const posicion = ids.indexOf(p.transferencia_id)
          if (!productoMap[p.producto] || posicion < productoMap[p.producto]._posicion) {
            productoMap[p.producto] = { ...p, _posicion: posicion }
          }
        })

        resultados[almacen.id] = {
          almacen,
          productos: Object.values(productoMap)
            .sort((a, b) => a.producto.localeCompare(b.producto))
        }
      }

      setAlmacenesOrden(almacenesConExistencia)
      setInventario(resultados)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Totales consolidados por producto sumando todos los almacenes
  const totales = {}
  Object.values(inventario).forEach(({ productos }) => {
    productos.forEach(p => {
      if (!totales[p.producto]) {
        totales[p.producto] = { producto: p.producto, unidad: p.unidad, total: 0 }
      }
      totales[p.producto].total += parseFloat(p.existencia || 0)
    })
  })
  const totalesOrdenados = Object.values(totales).sort((a, b) => a.producto.localeCompare(b.producto))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
              <p className="text-xs text-gray-500">Existencias actuales por almacén</p>
            </div>
          </div>
          <button
            onClick={cargarInventario}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-primary transition"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : almacenesOrden.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay almacenes con existencia habilitada</p>
          </div>
        ) : (
          <>
            {/* Bloque por almacén */}
            {almacenesOrden.map(almacen => {
              const datos = inventario[almacen.id]
              return (
                <div key={almacen.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-primary/5 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-primary">{almacen.nombre}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {!datos || datos.productos.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Sin existencias registradas</p>
                    ) : (
                      datos.productos.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-800">{p.producto}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {Number(p.existencia).toLocaleString('es')}
                            </span>
                            {p.unidad && (
                              <span className="text-xs text-gray-400 ml-1">{p.unidad}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            {/* Bloque totales */}
            {totalesOrdenados.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-white" />
                  <p className="text-sm font-bold text-white">Total consolidado</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {totalesOrdenados.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-800">{p.producto}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {Number(p.total).toLocaleString('es')}
                        </span>
                        {p.unidad && (
                          <span className="text-xs text-gray-400 ml-1">{p.unidad}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
