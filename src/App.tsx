import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store/useStore'
import { useData } from './hooks/useData'

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

function AppContent() {
  const { user, loading, setUser, setLoading } = useStore()
  useData(user?.uid)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) {
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
    <Routes>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <InstallPrompt />
    </BrowserRouter>
  )
}
