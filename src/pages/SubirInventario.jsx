import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

export default function SubirInventario() {
  const navigate = useNavigate()
  const [fileData, setFileData] = useState(null) // { name, todos[], nuevos[], duplicados[] }
  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null) // { insertados, omitidos }
  const [error, setError] = useState('')

  async function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setError('')
    setResultado(null)
    setFileData(null)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

        const filas = data.slice(1).filter(row => row[0])
        const todos = filas.map(row => ({
          nombre: String(row[0] || '').trim(),
          unidad_medida: String(row[1] || '').trim() || null,
        })).filter(p => p.nombre)

        if (todos.length === 0) {
          setError('No se encontraron productos en el archivo.')
          return
        }

        // Verificar duplicados contra la BD
        setChecking(true)
        try {
          const { data: existentes, error: err } = await supabase
            .from('productos_base')
            .select('nombre')

          if (err) throw err

          const nombresExistentes = new Set(
            (existentes || []).map(p => p.nombre.toLowerCase().trim())
          )

          const nuevos = todos.filter(p => !nombresExistentes.has(p.nombre.toLowerCase()))
          const duplicados = todos.filter(p => nombresExistentes.has(p.nombre.toLowerCase()))

          setFileData({ name: f.name, todos, nuevos, duplicados })
        } catch (e) {
          setError('Error al verificar duplicados: ' + (e.message || ''))
        } finally {
          setChecking(false)
        }
      } catch (e) {
        setError('Error al leer el archivo. Asegúrate de que sea un Excel válido.')
      }
    }
    reader.readAsBinaryString(f)
  }

  async function handleSubir() {
    if (!fileData?.nuevos?.length) return
    setLoading(true)
    setError('')
    try {
      // Insertar solo los productos nuevos, en lotes de 100
      const lotes = []
      for (let i = 0; i < fileData.nuevos.length; i += 100) {
        lotes.push(fileData.nuevos.slice(i, i + 100))
      }

      for (const lote of lotes) {
        const { error: err } = await supabase
          .from('productos_base')
          .insert(lote)
        if (err) throw err
      }

      setResultado({
        insertados: fileData.nuevos.length,
        omitidos: fileData.duplicados.length,
      })
      setFileData(null)
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

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {resultado ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-2">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900">¡Subido!</h2>
            <p className="text-gray-700 font-medium">
              {resultado.insertados} producto{resultado.insertados !== 1 ? 's' : ''} nuevo{resultado.insertados !== 1 ? 's' : ''} agregado{resultado.insertados !== 1 ? 's' : ''}
            </p>
            {resultado.omitidos > 0 && (
              <p className="text-sm text-amber-600">
                {resultado.omitidos} omitido{resultado.omitidos !== 1 ? 's' : ''} por ya existir en la base de datos
              </p>
            )}
            <button
              onClick={() => setResultado(null)}
              className="mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Subir otro archivo
            </button>
          </div>
        ) : (
          <>
            {/* Formato */}
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
                  <span>Arroz</span><span>kg</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-500">
                  <span>Aceite</span><span>lt</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Selector de archivo */}
            <label className="block">
              <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 text-center cursor-pointer hover:border-primary transition">
                <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  {fileData?.name || 'Seleccionar archivo Excel'}
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

            {/* Verificando */}
            {checking && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Verificando duplicados...
              </div>
            )}

            {/* Preview con resumen */}
            {fileData && !checking && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">

                {/* Resumen */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{fileData.nuevos.length}</p>
                    <p className="text-xs text-green-600 mt-0.5">nuevos a insertar</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{fileData.duplicados.length}</p>
                    <p className="text-xs text-amber-600 mt-0.5">ya existen (se omiten)</p>
                  </div>
                </div>

                {/* Lista de duplicados si hay */}
                {fileData.duplicados.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-xs font-semibold text-amber-700">Ya existen en la BD (se omitirán):</p>
                    </div>
                    <div className="space-y-0.5 max-h-28 overflow-y-auto">
                      {fileData.duplicados.map((p, i) => (
                        <p key={i} className="text-xs text-amber-700 truncate">• {p.nombre}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vista previa de nuevos */}
                {fileData.nuevos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                      Primeros nuevos a insertar:
                    </p>
                    <div className="space-y-1">
                      {fileData.nuevos.slice(0, 5).map((p, i) => (
                        <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                          <span className="text-gray-800">{p.nombre}</span>
                          <span className="text-gray-500">{p.unidad_medida || '—'}</span>
                        </div>
                      ))}
                      {fileData.nuevos.length > 5 && (
                        <p className="text-xs text-gray-400 pt-1">y {fileData.nuevos.length - 5} más...</p>
                      )}
                    </div>
                  </div>
                )}

                {fileData.nuevos.length === 0 ? (
                  <p className="text-center text-sm text-amber-700 font-medium py-2">
                    Todos los productos del archivo ya existen. Nada que insertar.
                  </p>
                ) : (
                  <button
                    onClick={handleSubir}
                    disabled={loading}
                    className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {loading ? 'Subiendo...' : `Insertar ${fileData.nuevos.length} producto${fileData.nuevos.length !== 1 ? 's' : ''} nuevo${fileData.nuevos.length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
