import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const C = '#CDFA41'

type Screen = 'login' | 'signup' | 'reset'

export default function Auth() {
  const [screen, setScreen] = useState<Screen>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const cleanError = (msg: string) => {
    if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
      return 'Invalid email or password.'
    if (msg.includes('email-already-in-use')) return 'An account with this email already exists.'
    if (msg.includes('weak-password')) return 'Password must be at least 6 characters.'
    if (msg.includes('invalid-email')) return 'Please enter a valid email address.'
    if (msg.includes('network-request-failed')) return 'No internet connection.'
    return msg.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '').trim()
  }

  // ── Signup — matches Android AuthService.signUp() exactly ──────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)

      // Send verification email — non-blocking, ignore errors (same as Android)
      try { await sendEmailVerification(cred.user) } catch (_) {}

      // Create Firestore profile with trial start (same as Android)
      try {
        await setDoc(doc(db, 'users', cred.user.uid, 'profile', 'data'), {
          uid: cred.user.uid,
          email,
          createdAt: Date.now(),
          trialStartedAt: Date.now(),
          subscriptionStatus: 'trial',
        }, { merge: true })
      } catch (_) {}

      // User is now signed in — onAuthStateChanged in App.tsx routes them to the app
    } catch (err: any) {
      setError(cleanError(err.message || 'Sign up failed'))
    } finally {
      setLoading(false)
    }
  }

  // ── Login — same as Android: just sign in, no verification gate ────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // onAuthStateChanged in App.tsx handles routing
    } catch (err: any) {
      setError(cleanError(err.message || 'Sign in failed'))
    } finally {
      setLoading(false)
    }
  }

  // ── Password reset ─────────────────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: any) {
      setError(cleanError(err.message || 'Reset failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0A0E14' }}>
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="ZAP" className="w-24 h-24 mx-auto mb-4 rounded-2xl"
          style={{ filter: 'drop-shadow(0 0 20px rgba(205,250,65,0.4))' }} />
        <h1 className="text-2xl font-bold" style={{ color: C }}>ZAP PEP/TRT Tracker</h1>
        <p className="text-text-tertiary text-sm mt-1">Track your peptide &amp; TRT protocols</p>
      </div>

      <div className="glossy-card w-full max-w-sm">

        {/* ── PASSWORD RESET SCREEN ── */}
        {screen === 'reset' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">Reset password</h2>
              <p className="text-text-secondary text-sm">Enter your email and we'll send a reset link.</p>
            </div>
            {resetSent ? (
              <div className="text-center space-y-3">
                <p className="text-sm" style={{ color: C }}>Reset email sent! Check your inbox.</p>
                <button onClick={() => { setScreen('login'); setResetSent(false) }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: C, color: '#0A0E14' }}>Back to Sign In</button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                  placeholder="you@example.com" required />
                {error && <p className="text-status-red text-xs bg-status-red/10 border border-status-red/30 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50"
                  style={{ background: C, color: '#0A0E14' }}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
                <button type="button" onClick={() => { setScreen('login'); setError('') }}
                  className="w-full text-sm text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── LOGIN SCREEN ── */}
        {screen === 'login' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Sign In</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                  placeholder="you@example.com" required />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                  placeholder="••••••••" required minLength={6} />
              </div>
              {error && <p className="text-status-red text-xs bg-status-red/10 border border-status-red/30 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50"
                style={{ background: C, color: '#0A0E14' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => { setScreen('reset'); setError('') }}
                className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Forgot password?
              </button>
              <button onClick={() => { setScreen('signup'); setError('') }}
                className="text-sm font-medium" style={{ color: C }}>
                Create account
              </button>
            </div>
          </div>
        )}

        {/* ── SIGNUP SCREEN ── */}
        {screen === 'signup' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Create Account</h2>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                  placeholder="you@example.com" required />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary"
                  placeholder="Min. 6 characters" required minLength={6} />
              </div>
              {error && <p className="text-status-red text-xs bg-status-red/10 border border-status-red/30 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50"
                style={{ background: C, color: '#0A0E14' }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            <div className="text-center pt-1">
              <button onClick={() => { setScreen('login'); setError('') }}
                className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Already have an account? <span style={{ color: C }}>Sign in</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-text-tertiary text-xs text-center max-w-xs">
        Your data is stored securely and syncs across all your devices.
      </p>
    </div>
  )
}
