import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useStore } from '../store/useStore'
import { useSubscription } from '../lib/useSubscription'

const C = '#C4EF95'

function Row({ icon, label, right, onPress, href }: {
  icon: React.ReactNode
  label: string
  right?: React.ReactNode
  onPress?: () => void
  href?: string
}) {
  const inner = (
    <div className="w-full glossy-card flex items-center gap-3 text-left active:scale-[0.99] transition-transform">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-text-primary text-sm flex-1">{label}</span>
      {right ?? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#546E7A" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>}
    </div>
  )
  if (href) return <a href={href} className="block">{inner}</a>
  return <button onClick={onPress} className="w-full">{inner}</button>
}

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useStore()
  const subscription = useSubscription(user?.uid)

  const [unitSystem, setUnitSystem] = useState<'US' | 'CA'>('US')
  const [gender, setGender] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    getDoc(doc(db, 'users', user.uid, 'profile', 'data')).then(snap => {
      const data = snap.data()
      if (data?.unitSystem) setUnitSystem(data.unitSystem)
      if (data?.gender) setGender(data.gender)
    })
  }, [user?.uid])

  const saveProfile = async () => {
    if (!user?.uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), {
        unitSystem,
        gender: gender || null,
      }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const subLabel =
    subscription.status === 'active' ? 'Active' :
    subscription.status === 'trialing' ? `Trial · ${subscription.daysLeft}d left` :
    'Expired'
  const subColor =
    subscription.status === 'active' ? C :
    subscription.status === 'trialing' ? '#FFD740' : '#FF5252'

  return (
    <div className="screen-enter space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-text-secondary p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
      </div>

      {/* ── ACCOUNT ─────────────────────────────────── */}
      <div>
        <p className="text-text-tertiary text-xs font-medium mb-2 px-1">ACCOUNT</p>
        <div className="glossy-card space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Email</span>
            <span className="text-text-primary text-sm">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Subscription</span>
            <span className="text-sm font-semibold" style={{ color: subColor }}>{subLabel}</span>
          </div>
          {subscription.status !== 'active' && (
            <button
              onClick={() => navigate('/subscribe')}
              className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(205,250,65,0.1)', color: C, border: '1px solid rgba(205,250,65,0.25)' }}
            >
              {subscription.status === 'expired' ? 'Subscribe Now' : 'Subscribe — Lock in Launch Pricing'}
            </button>
          )}
        </div>
      </div>

      {/* ── PROFILE ─────────────────────────────────── */}
      <div>
        <p className="text-text-tertiary text-xs font-medium mb-2 px-1">PROFILE</p>
        <div className="glossy-card space-y-4">
          {/* Unit system */}
          <div>
            <label className="text-xs text-text-secondary block mb-2">Units</label>
            <div className="flex gap-2">
              {(['US', 'CA'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => setUnitSystem(u)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={unitSystem === u
                    ? { background: C, color: '#0A0E14' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {u === 'US' ? 'Imperial (lbs, in)' : 'Metric (kg, cm)'}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs text-text-secondary block mb-2">Gender</label>
            <div className="flex gap-2 flex-wrap">
              {['Male', 'Female', 'Other', 'Prefer not to say'].map(g => (
                <button
                  key={g}
                  onClick={() => setGender(gender === g ? '' : g)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={gender === g
                    ? { background: C, color: '#0A0E14' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: saved ? 'rgba(205,250,65,0.15)' : C, color: saved ? C : '#0A0E14', border: saved ? `1px solid ${C}` : 'none' }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── SUPPORT ─────────────────────────────────── */}
      <div>
        <p className="text-text-tertiary text-xs font-medium mb-2 px-1">SUPPORT</p>
        <div className="space-y-1">
          <Row
            href="mailto:support@zapanalytics.com"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            }
            label="Contact Support"
            right={<span className="text-text-tertiary text-xs">support@zapanalytics.com</span>}
          />
          <Row
            href="https://play.google.com/store/apps/details?id=com.zap.peptidetracker"
            icon={
              <svg width="18" height="18" viewBox="0 0 512 512" aria-hidden="true">
                <path fill="#34A853" d="M325.3 234.3 104.6 13l280.8 161-60.1 60.3z"/>
                <path fill="#FBBC04" d="m13 6.8-.1 498.4 257.4-249-257.3-249.4z"/>
                <path fill="#EA4335" d="M325.3 277.7 65.5 505.3l319.9-184.6-60.1-43z"/>
                <path fill="#4285F4" d="M480.4 247.7 384.4 192l-66.5 64 66.5 64 96.5-55.6c28.8-22.6 28.8-39.2-.5-16.7z"/>
              </svg>
            }
            label="Rate on Google Play"
          />
        </div>
      </div>

      {/* ── LEGAL ───────────────────────────────────── */}
      <div>
        <p className="text-text-tertiary text-xs font-medium mb-2 px-1">LEGAL</p>
        <div className="space-y-1">
          <Row
            onPress={() => {}}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            }
            label="Privacy Policy"
          />
          <Row
            onPress={() => {}}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            }
            label="Terms of Service"
          />
        </div>
      </div>

      {/* ── SIGN OUT ────────────────────────────────── */}
      <button
        onClick={() => signOut(auth)}
        className="w-full border border-status-red/30 text-status-red py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
      >
        Sign Out
      </button>

      <div className="text-center pt-1">
        <p className="text-text-tertiary text-xs">ZAP PEP/TRT Tracker · Web</p>
        <p className="text-text-tertiary text-xs mt-0.5">Version 1.0</p>
      </div>
    </div>
  )
}
