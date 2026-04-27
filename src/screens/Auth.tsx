import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

const C = '#CDFA41'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '') || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0A0E14' }}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="ZAP" className="w-24 h-24 mx-auto mb-4 rounded-2xl" style={{ filter: 'drop-shadow(0 0 20px rgba(205,250,65,0.4))' }} />
        <h1 className="text-2xl font-bold" style={{ color: C }}>ZAP PEP/TRT Tracker</h1>
        <p className="text-text-tertiary text-sm mt-1">Track your peptide &amp; TRT protocols</p>
      </div>

      {/* Card */}
      <div className="glossy-card w-full max-w-sm">
        <h2 className="text-lg font-semibold text-text-primary mb-6">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-status-red text-xs bg-status-red/10 border border-status-red/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 active:scale-95 transition-transform"
            style={{ background: C, color: '#0A0E14' }}
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="text-sm" style={{ color: C }}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>

      <p className="mt-6 text-text-tertiary text-xs text-center max-w-xs">
        Your data is stored securely and syncs across all your devices.
      </p>
    </div>
  )
}
