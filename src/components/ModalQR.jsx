import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'
import { X, Download } from 'lucide-react'

export default function ModalQR({ almacen, onClose }) {
  const qrRef = useRef(null)

  if (!almacen) return null

  const descargarQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `QR-${almacen.nombre.replace(/\s+/g, '-')}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">QR de {almacen.nombre}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div ref={qrRef} className="bg-white p-4 rounded-lg">
            <QRCodeSVG 
              value={almacen.qr_secret} 
              size={250}
              level="M"
              includeMargin={true}
            />
          </div>
          
          <p className="text-sm text-gray-500 text-center mt-4">
            Escanea este código para autorizar transferencias hacia este almacén
          </p>
          
          <button
            onClick={descargarQR}
            className="mt-4 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Descargar QR
          </button>
        </div>
      </div>
    </div>
  )
}
