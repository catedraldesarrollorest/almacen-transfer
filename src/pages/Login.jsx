import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Warehouse } from 'lucide-react'

export default function Login() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pin.trim()) return
    setError('')
    setLoading(true)
    try {
      await signIn(pin)
      navigate('/')
    } catch (err) {
      setError(err.message || 'PIN incorrecto')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function handleDigit(d) {
    if (pin.length < 10) setPin(p => p + d)
    setError('')
  }

  function handleBorrar() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Warehouse className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">AlmacenTransfer</h1>
          <p className="text-blue-200 text-sm mt-1">Ingresa tu PIN para acceder</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Pantalla PIN */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4 text-center">
            <div className="flex justify-center items-center gap-3 h-10">
              {pin.length === 0 ? (
                <span className="text-blue-200 text-sm">Ingresa tu PIN</span>
              ) : (
                Array.from({ length: pin.length }).map((_, i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-white" />
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-xl p-3 mb-4 text-center">
              {error}
            </div>
          )}

          {/* Teclado numérico */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {digits.map((d, i) => (
              d === '' ? (
                <div key={i} />
              ) : d === '⌫' ? (
                <button
                  key={i}
                  type="button"
                  onClick={handleBorrar}
                  className="h-16 rounded-2xl bg-white/10 text-white text-xl font-medium flex items-center justify-center active:bg-white/20 transition"
                >
                  {d}
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="h-16 rounded-2xl bg-white/10 text-white text-2xl font-semibold flex items-center justify-center active:bg-white/20 transition"
                >
                  {d}
                </button>
              )
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full bg-white text-primary rounded-2xl py-4 font-bold text-base disabled:opacity-40 transition"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
