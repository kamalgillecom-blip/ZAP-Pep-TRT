import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store/useStore'
import { useData } from './hooks/useData'
import { useSubscription } from './lib/useSubscription'

import Layout from './components/Layout'
import InstallPrompt from './components/InstallPrompt'
import Auth from './screens/Auth'
import Dashboard from './screens/Dashboard'
import DoseLog from './screens/DoseLog'
import AddDose from './screens/AddDose'
import Vials from './screens/Vials'
import BodyComp from './screens/BodyComp'
import Schedules from './screens/Schedules'
import Bloodwork from './screens/Bloodwork'
import Compounds from './screens/Compounds'
import More from './screens/More'
import Plotter from './screens/Plotter'
import ExerciseLogs from './screens/ExerciseLogs'
import Paywall from './screens/Paywall'
import PaymentSuccess from './screens/PaymentSuccess'
import Settings from './screens/Settings'

function AppContent() {
  const { user, loading, setUser, setLoading } = useStore()
  useData(user?.uid)
  const subscription = useSubscription(user?.uid)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // Block unverified users — prevents the 1-second flash after signup
      // where the user is signed in but hasn't verified their email yet.
      // Auth.tsx handles signOut and the verify screen after signup.
      if (u && !u.emailVerified) {
        setUser(null)
        setLoading(false)
        return
      }
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading || (user && subscription.status === 'loading')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <>
      {/* Soft trial warning banner (last day of trial) */}
      {subscription.status === 'trialing' && subscription.daysLeft <= 1 && (
        <div style={{ background: 'rgba(255,200,0,0.12)', borderBottom: '1px solid rgba(255,200,0,0.3)', padding: '6px 16px', textAlign: 'center' }}>
          <span style={{ color: '#FFD740', fontSize: 12, fontWeight: 600 }}>
            {subscription.daysLeft === 1 ? 'Last day of your trial —' : 'Your trial ends today —'}
          </span>
          <span style={{ color: '#FFD740', fontSize: 12 }}> subscribe to keep your data.</span>
        </div>
      )}
      <Routes>
        {/* Always reachable — Stripe redirects here after checkout */}
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Trial expired — paywall for all other routes */}
        {subscription.status === 'expired' && (
          <Route path="*" element={<Paywall daysLeft={0} />} />
        )}

        {/* Active / trialing — full app */}
        {subscription.status !== 'expired' && (
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dose-log" element={<DoseLog />} />
            <Route path="/add-dose" element={<AddDose />} />
            <Route path="/vials" element={<Vials />} />
            <Route path="/body-comp" element={<BodyComp />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/bloodwork" element={<Bloodwork />} />
            <Route path="/compounds" element={<Compounds />} />
            <Route path="/plotter" element={<Plotter />} />
            <Route path="/exercise" element={<ExerciseLogs />} />
            <Route path="/more" element={<More />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/subscribe" element={<Paywall daysLeft={subscription.daysLeft} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <AppContent />
      <InstallPrompt />
    </BrowserRouter>
  )
}
