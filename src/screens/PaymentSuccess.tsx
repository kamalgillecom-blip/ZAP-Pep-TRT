import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const C = '#C4EF95'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(t); navigate('/'); return 0 }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0A0E14' }}>
      {/* Animated checkmark */}
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'rgba(205,250,65,0.12)', border: '2px solid rgba(205,250,65,0.3)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">You're all set!</h1>
      <p className="text-text-secondary text-sm mb-1">Your subscription is active.</p>
      <p className="text-text-tertiary text-xs mb-6">Welcome to ZAP full access.</p>

      <p className="text-text-tertiary text-sm">
        Redirecting in <span style={{ color: C }} className="font-bold">{countdown}</span>…
      </p>

      <button onClick={() => navigate('/')}
        className="mt-4 font-bold py-3 px-8 rounded-xl text-sm active:scale-95 transition-transform"
        style={{ background: C, color: '#0A0E14' }}>
        Go to Dashboard
      </button>
    </div>
  )
}
