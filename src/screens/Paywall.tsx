import { useState } from 'react'
import { useStore } from '../store/useStore'
import { auth } from '../firebase'

const C = '#CDFA41'
const BG = '#0A0E14'

const FEATURES = [
  'Unlimited dose logging & history',
  'Pharmacokinetics serum plotter',
  'Body composition tracking + progress photos',
  'Exercise log with sets & reps',
  'Bloodwork panel tracker',
  'Vial inventory management',
  'Protocol schedules & reminders',
  'Multi-device sync via Firebase',
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

interface PlanCardProps {
  plan: 'monthly' | 'yearly'
  selected: boolean
  currency: 'CAD' | 'USD'
  onSelect: () => void
}

function PlanCard({ plan, selected, currency, onSelect }: PlanCardProps) {
  const isYearly = plan === 'yearly'
  const price = isYearly ? '99.99' : '9.99'
  const period = isYearly ? '/ year' : '/ month'
  const perMonth = isYearly ? '8.33' : '9.99'
  const saving = isYearly ? 'Save 17%' : null

  return (
    <button
      onClick={onSelect}
      className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
      style={{
        background: selected ? 'rgba(205,250,65,0.08)' : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? C : 'rgba(255,255,255,0.1)'}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-bold text-base">{isYearly ? 'Annual' : 'Monthly'}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <p className="font-bold text-2xl" style={{ color: C }}>${price}</p>
            <p className="text-text-secondary text-sm">{currency} {period}</p>
          </div>
          {isYearly && (
            <p className="text-text-tertiary text-xs mt-0.5">${perMonth} {currency}/mo billed annually</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {saving && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(205,250,65,0.15)', color: C }}>
              {saving}
            </span>
          )}
          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: selected ? C : 'rgba(255,255,255,0.25)', background: selected ? C : 'transparent' }}>
            {selected && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function Paywall({ daysLeft }: { daysLeft: number }) {
  const { user } = useStore()
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currency] = useState<'CAD' | 'USD'>(() => {
    // Best-effort geo guess from browser locale
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz.startsWith('America/') && [
        'America/Toronto', 'America/Vancouver', 'America/Edmonton',
        'America/Winnipeg', 'America/Halifax', 'America/St_Johns',
        'America/Regina', 'America/Moncton', 'America/Whitehorse',
      ].includes(tz)) return 'CAD'
    } catch {}
    return 'USD'
  })

  const trialExpired = daysLeft <= 0

  const handleSubscribe = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: user.email, plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to create session')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8" style={{ background: BG }}>
      {/* Logo */}
      <img src="/logo.png" alt="ZAP" className="w-16 h-16 rounded-2xl mb-5"
        style={{ filter: 'drop-shadow(0 0 16px rgba(205,250,65,0.4))' }} />

      {/* Trial status */}
      {trialExpired ? (
        <div className="mb-5 px-4 py-2.5 rounded-xl text-center"
          style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)' }}>
          <p className="text-sm font-bold text-status-red">Your 7-day trial has ended</p>
          <p className="text-xs text-text-secondary mt-0.5">Subscribe to continue tracking your protocol</p>
        </div>
      ) : (
        <div className="mb-5 px-4 py-2.5 rounded-xl text-center"
          style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.25)' }}>
          <p className="text-sm font-bold" style={{ color: '#FFD740' }}>
            {daysLeft === 1 ? 'Last day of your trial' : `${daysLeft} days left in your trial`}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">Subscribe now to keep your data and access</p>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white text-center mb-1">
        Unlock <span style={{ color: C }}>ZAP</span> Full Access
      </h1>
      <p className="text-text-secondary text-sm text-center mb-1">
        Introductory launch pricing — sign up now before prices change.
      </p>
      <p className="text-text-tertiary text-xs text-center mb-5">
        {currency === 'CAD' ? 'Prices shown in Canadian dollars' : 'Prices shown in US dollars'}
      </p>

      {/* Plan cards */}
      <div className="w-full max-w-sm space-y-3 mb-5">
        <PlanCard plan="yearly"   selected={plan === 'yearly'}   currency={currency} onSelect={() => setPlan('yearly')} />
        <PlanCard plan="monthly"  selected={plan === 'monthly'}  currency={currency} onSelect={() => setPlan('monthly')} />
      </div>

      {/* Features */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {FEATURES.map(f => (
          <div key={f} className="flex items-center gap-2.5">
            <div className="flex-shrink-0"><CheckIcon /></div>
            <p className="text-text-secondary text-sm">{f}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-status-red text-sm mb-3 text-center bg-status-red/10 border border-status-red/30 rounded-xl px-4 py-2">{error}</p>
      )}

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-base disabled:opacity-50 active:scale-95 transition-transform"
          style={{ background: C, color: BG }}>
          {loading ? 'Opening checkout...' : `Subscribe — ${currency} $${plan === 'yearly' ? '99.99' : '9.99'}/${plan === 'yearly' ? 'yr' : 'mo'}`}
        </button>

        <button
          onClick={() => auth.signOut()}
          className="w-full py-2 text-sm text-text-tertiary">
          Sign out
        </button>
      </div>

      <p className="text-text-tertiary text-xs text-center mt-5 max-w-xs">
        Cancel anytime. Billed by Stripe. Your data stays yours.
      </p>
    </div>
  )
}
