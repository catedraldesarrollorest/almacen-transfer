import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #7F1D1D 0%, #5C1515 60%, #3D0D0D 100%)' }}
    >
      <div className="w-full max-w-xs">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl px-8 pt-8 pb-7">

          {/* Logo */}
          <div className="flex flex-col items-center mb-5">
            {/* Cross */}
            <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
              <rect x="17" y="0" width="10" height="52" rx="3" fill="#7F1D1D"/>
              <rect x="0" y="14" width="44" height="10" rx="3" fill="#7F1D1D"/>
            </svg>

            {/* La Catedral text */}
            <p className="text-sm italic text-primary leading-none mb-0.5" style={{fontFamily:'Georgia, serif'}}>La</p>
            <p
              className="text-3xl font-bold tracking-widest text-primary leading-none"
              style={{fontFamily:'Georgia, serif', letterSpacing:'0.15em'}}
            >CATEDRAL</p>
            <p className="text-xs tracking-widest text-gray-500 mt-1" style={{letterSpacing:'0.2em'}}>BAR · RESTAURANTE</p>

            {/* Gold divider */}
            <div className="w-full h-px mt-4 mb-4" style={{background:'linear-gradient(to right, transparent, #C9A84C, transparent)'}} />

            {/* App label */}
            <span
              className="text-xs tracking-widest text-primary font-semibold uppercase"
              style={{letterSpacing:'0.18em'}}
            >Transferencias</span>
          </div>

          {/* PIN boxes */}
          <p className="text-center text-xs font-semibold tracking-widest text-gray-500 mb-3 uppercase" style={{letterSpacing:'0.18em'}}>
            PIN de acceso
          </p>
          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className="w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all"
                style={{
                  borderColor: i === pin.length && pin.length < 4 ? '#7F1D1D' : pin.length > i ? '#C9A84C' : '#E5E7EB',
                  color: '#7F1D1D'
                }}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-2.5 mb-3 text-center">
              {error}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {digits.map((d, i) => (
              d === '' ? (
                <div key={i} />
              ) : d === '⌫' ? (
                <button
                  key={i}
                  type="button"
                  onClick={handleBorrar}
                  className="h-14 rounded-2xl text-xl font-medium flex items-center justify-center transition active:scale-95"
                  style={{background:'#FEF2F2', color:'#7F1D1D'}}
                >
                  {d}
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="h-14 rounded-2xl text-2xl font-semibold flex items-center justify-center transition active:scale-95"
                  style={{background:'#F9FAFB', color:'#374151', border:'1px solid #E5E7EB'}}
                >
                  {d}
                </button>
              )
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !pin}
            className="w-full rounded-2xl py-3.5 font-bold text-sm tracking-widest text-white transition disabled:opacity-40 uppercase"
            style={{background:'#7F1D1D', letterSpacing:'0.1em'}}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
