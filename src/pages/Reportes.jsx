import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, FileSpreadsheet, Download, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatFecha, formatFechaHora } from '../lib/dateUtils'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

export default function Reportes() {
  const navigate = useNavigate()
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchTransferencias() {
    const { data, error: err } = await supabase
      .from('transferencias')
      .select('*, origen:origen_id(nombre), destino:destino_id(nombre), productos:transferencia_productos(*)')
      .gte('created_at', `${fechaInicio}T00:00:00`)
      .lte('created_at', `${fechaFin}T23:59:59`)
      .order('created_at', { ascending: false })

    if (err) throw err
    return data || []
  }

  async function generarPDF() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchTransferencias()
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('La Catedral — Reporte de Transferencias', pageW / 2, 20, { align: 'center' })

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Período: ${fechaInicio} al ${fechaFin}`, pageW / 2, 28, { align: 'center' })
      doc.text(`Total transferencias: ${data.length}`, pageW / 2, 34, { align: 'center' })

      let y = 45
      const completadas = data.filter(t => t.estado === 'completado').length
      const pendientes = data.filter(t => t.estado === 'pendiente').length
      const totalProductos = data.reduce((sum, t) => sum + (t.productos?.length || 0), 0)

      doc.setFontSize(9)
      doc.text(`Completadas: ${completadas}  |  Pendientes: ${pendientes}  |  Total productos: ${totalProductos}`, 14, y)
      y += 10

      // Encabezado tabla
      doc.setFont('helvetica', 'bold')
      doc.setFillColor(30, 58, 95)
      doc.rect(14, y, pageW - 28, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(6.5)
      doc.text('Fecha',    16,  y + 5.5)
      doc.text('Origen',   40,  y + 5.5)
      doc.text('Destino',  66,  y + 5.5)
      doc.text('Producto', 92,  y + 5.5)
      doc.text('Exist.',   130, y + 5.5)
      doc.text('Cant.',    144, y + 5.5)
      doc.text('Entrega',  158, y + 5.5)
      doc.text('Recibe',   176, y + 5.5)
      doc.text('Estado',   194, y + 5.5)
      y += 10

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      data.forEach((t, i) => {
        const productos = t.productos?.length > 0 ? t.productos : [{ producto: 'Sin productos', cantidad: '', unidad: '', existencia: null }]

        productos.forEach((p, pi) => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          if (i % 2 === 0) {
            doc.setFillColor(248, 250, 252)
            doc.rect(14, y - 1, pageW - 28, 7, 'F')
          }
          const fecha = formatFecha(t.created_at)
          doc.setFontSize(6.5)
          doc.text(fecha, 16, y + 4)
          doc.text((t.origen?.nombre || '').substring(0, 13), 40, y + 4)
          doc.text((t.destino?.nombre || '').substring(0, 13), 66, y + 4)
          doc.text((p.producto || '').substring(0, 18), 92, y + 4)
          doc.text(p.existencia != null ? String(p.existencia) : '—', 130, y + 4)
          const cantidadText = p.cantidad ? `${p.cantidad} ${p.unidad || ''}`.substring(0, 10) : ''
          doc.text(cantidadText, 144, y + 4)
          if (pi === 0) {
            doc.text((t.entrega_nombre || '—').substring(0, 10), 158, y + 4)
            doc.text((t.recibe_nombre || '—').substring(0, 10), 176, y + 4)
            doc.text(t.estado.substring(0, 10), 194, y + 4)
          }
          y += 7
        })
      })

      doc.save(`reporte_${fechaInicio}_${fechaFin}.pdf`)
    } catch (e) {
      setError(e.message || 'Error al generar PDF')
    } finally {
      setLoading(false)
    }
  }

  async function generarExcel() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchTransferencias()
      // Expandir filas para incluir cada producto como fila separada
      const rows = []
      data.forEach(t => {
        const productos = t.productos?.length > 0 ? t.productos : [{ producto: 'Sin productos', cantidad: '', unidad: '' }]
        productos.forEach((p, idx) => {
          rows.push({
            'Fecha': idx === 0 ? formatFechaHora(t.created_at) : '',
            'Origen': idx === 0 ? (t.origen?.nombre || '') : '',
            'Destino': idx === 0 ? (t.destino?.nombre || '') : '',
            'Producto': p.producto || '',
            'Existencia': p.existencia != null ? p.existencia : '',
            'Cantidad': p.cantidad || '',
            'Unidad': p.unidad || '',
            'Quien Entrega': idx === 0 ? (t.entrega_nombre || '') : '',
            'Quien Recibe': idx === 0 ? (t.recibe_nombre || '') : '',
            'Estado': idx === 0 ? t.estado : '',
            'Código QR': idx === 0 ? (t.codigo_qr || '') : '',
          })
        })
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Transferencias')

      // Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 20 }, { wch: 25 }, { wch: 25 },
        { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 25 }
      ]

      // Descarga compatible con navegador Web (usa Blob en lugar de writeFile)
      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbOut], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_${fechaInicio}_${fechaFin}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message || 'Error al generar Excel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-4xl mx-auto md:rounded-2xl md:shadow-sm md:overflow-hidden md:border border-gray-100">
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-error text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Rango de fechas */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Período
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <button
            onClick={generarPDF}
            disabled={loading}
            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition disabled:opacity-60 text-left"
          >
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Exportar PDF</p>
              <p className="text-sm text-gray-500">Vista rápida para revisar</p>
            </div>
            <Download className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={generarExcel}
            disabled={loading}
            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition disabled:opacity-60 text-left"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Exportar Excel</p>
              <p className="text-sm text-gray-500">Descargable para editar</p>
            </div>
            <Download className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  )
}
