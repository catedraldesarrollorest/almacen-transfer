import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

export default function SubirInventario() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

        // Esperar columnas: nombre, unidad_medida (primera fila = cabecera)
        const filas = data.slice(1).filter(row => row[0])
        const productos = filas.map(row => ({
          nombre: String(row[0] || '').trim(),
          unidad_medida: String(row[1] || '').trim(),
        })).filter(p => p.nombre)

        setPreview(productos.slice(0, 5))
        setFile({ file: f, productos })
      } catch (e) {
        setError('Error al leer el archivo. Asegúrate de que sea un Excel válido.')
      }
    }
    reader.readAsBinaryString(f)
  }

  async function handleSubir() {
    if (!file?.productos?.length) return
    setLoading(true)
    setError('')
    try {
      // Insertar en lotes de 100
      const lotes = []
      for (let i = 0; i < file.productos.length; i += 100) {
        lotes.push(file.productos.slice(i, i + 100))
      }

      let insertados = 0
      for (const lote of lotes) {
        const { error: err, count } = await supabase
          .from('productos_base')
          .upsert(lote, { onConflict: 'nombre' })
          .select()
        if (err) throw err
        insertados += lote.length
      }

      setResultado({ total: file.productos.length })
      setFile(null)
      setPreview([])
    } catch (e) {
      setError(e.message || 'Error al subir productos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Subir Inventario</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {resultado ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900">¡Subido!</h2>
            <p className="text-gray-500 mt-2">{resultado.total} productos importados</p>
            <button
              onClick={() => setResultado(null)}
              className="mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Subir otro archivo
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-2">Formato del archivo</h2>
              <p className="text-sm text-gray-500 mb-3">
                El archivo Excel debe tener estas columnas en la primera fila:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700">
                <div className="grid grid-cols-2 gap-2 border-b border-gray-200 pb-1 mb-1 font-bold">
                  <span>nombre</span>
                  <span>unidad_medida</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-500">
                  <span>Arroz</span>
                  <span>kg</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-500">
                  <span>Aceite</span>
                  <span>lt</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <label className="block">
              <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 text-center cursor-pointer hover:border-primary transition">
                <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  {file?.file?.name || 'Seleccionar archivo Excel'}
                </p>
                <p className="text-xs text-gray-400 mt-1">.xlsx o .xls</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </label>

            {preview.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Vista previa ({file?.productos?.length} productos)
                </h3>
                <div className="space-y-1">
                  {preview.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-800">{p.nombre}</span>
                      <span className="text-gray-500">{p.unidad_medida}</span>
                    </div>
                  ))}
                  {file?.productos?.length > 5 && (
                    <p className="text-xs text-gray-400 pt-1">
                      y {file.productos.length - 5} más...
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSubir}
                  disabled={loading}
                  className="mt-4 w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {loading ? 'Subiendo...' : `Subir ${file.productos.length} productos`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
