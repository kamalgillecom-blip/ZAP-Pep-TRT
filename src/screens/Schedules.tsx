import { useState } from 'react'
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'
import { BUILTIN_COMPOUNDS } from '../data/compounds'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const REPEAT_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly (select days)' },
  { value: 'every_n_days', label: 'Every N days' },
  { value: 'monthly_date', label: 'Monthly on date' },
]

export default function Schedules() {
  const { schedules, user } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const [compoundId, setCompoundId] = useState('')
  const [doseValue, setDoseValue] = useState('')
  const [doseUnit, setDoseUnit] = useState('mcg')
  const [time, setTime] = useState('08:00')
  const [repeatType, setRepeatType] = useState('daily')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [intervalDays, setIntervalDays] = useState('2')
  const [monthDay, setMonthDay] = useState('1')

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  const handleSave = async () => {
    if (!user || !compoundId || !doseValue) return
    setSaving(true)
    try {
      const compound = BUILTIN_COMPOUNDS.find(c => c.id === compoundId)
      await addDoc(collection(db, 'users', user.uid, 'schedules'), {
        compoundId,
        compoundName: compound?.name || '',
        doseValue: parseFloat(doseValue),
        doseUnit,
        timeOfDay: time,
        repeatType,
        daysOfWeek: JSON.stringify(selectedDays),
        intervalDays: parseInt(intervalDays),
        monthDay: parseInt(monthDay),
        isActive: true,
        userId: user.uid,
        createdAt: Date.now(),
      })
      setShowAdd(false)
      setCompoundId(''); setDoseValue(''); setSelectedDays([])
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (schedule: typeof schedules[0]) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid, 'schedules', schedule.id), { isActive: !schedule.isActive })
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    await deleteDoc(doc(db, 'users', user.uid, 'schedules', id))
  }

  const formatSchedule = (s: typeof schedules[0]) => {
    const days = (() => { try { return JSON.parse(s.daysOfWeek) as number[] } catch { return [] } })()
    switch (s.repeatType) {
      case 'daily': return 'Daily'
      case 'weekly': return days.length ? days.map(d => DAY_LABELS[d - 1]).join(', ') : 'Weekly'
      case 'every_n_days': return s.intervalDays === 2 ? 'Every other day' : `Every ${s.intervalDays} days`
      case 'monthly_date': return `Monthly on day ${s.monthDay}`
      default: return 'Custom'
    }
  }

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Schedules</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-cyan-primary text-dark-bg text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          + Add
        </button>
      </div>

      {schedules.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No schedules yet</p>
          <p className="text-text-tertiary text-sm mt-1">Create a schedule for recurring doses</p>
        </div>
      )}

      <div className="space-y-2">
        {schedules.map(s => (
          <div key={s.id} className="glossy-card">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.vialColor || '#C4EF95' }} />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-sm">{s.compoundName}</p>
                <p className="text-cyan-light text-xs">{s.doseValue} {s.doseUnit} at {s.timeOfDay}</p>
                <p className="text-text-tertiary text-xs">{formatSchedule(s)}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle switch */}
                <button onClick={() => handleToggle(s)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${s.isActive ? 'bg-cyan-primary' : 'bg-dark-border'}`}
                  style={{ height: 22, width: 40 }}>
                  <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${s.isActive ? 'translate-x-5' : 'translate-x-0.5'}`}
                    style={{ width: 18, height: 18, transform: s.isActive ? 'translateX(20px)' : 'translateX(2px)', top: 2, left: 0, position: 'absolute', background: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }} />
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-status-red/60 text-xs p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="glossy-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-semibold text-base">Create Schedule</p>
                <button onClick={() => setShowAdd(false)} className="text-text-tertiary">✕</button>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Compound</label>
                <select value={compoundId} onChange={e => setCompoundId(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary">
                  <option value="">Select compound...</option>
                  {BUILTIN_COMPOUNDS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Dose</label>
                  <input type="number" value={doseValue} onChange={e => setDoseValue(e.target.value)}
                    placeholder="Amount" className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Unit</label>
                  <select value={doseUnit} onChange={e => setDoseUnit(e.target.value)}
                    className="bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary">
                    {['mcg', 'mg', 'IU', 'ml'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Time of Day</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Repeat</label>
                <select value={repeatType} onChange={e => setRepeatType(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary">
                  {REPEAT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {repeatType === 'weekly' && (
                <div>
                  <label className="block text-xs text-text-secondary mb-2">Days</label>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((d, i) => (
                      <button key={d} onClick={() => toggleDay(i + 1)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedDays.includes(i + 1) ? 'bg-cyan-primary text-dark-bg' : 'bg-dark-variant border border-dark-border text-text-secondary'
                        }`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}

              {repeatType === 'every_n_days' && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Every N days</label>
                  <input type="number" value={intervalDays} onChange={e => setIntervalDays(e.target.value)} min="2"
                    className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
                </div>
              )}

              {repeatType === 'monthly_date' && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Day of month</label>
                  <input type="number" value={monthDay} onChange={e => setMonthDay(e.target.value)} min="1" max="31"
                    className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 border border-dark-border text-text-secondary py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving || !compoundId || !doseValue}
                  className="flex-1 bg-cyan-primary text-dark-bg font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
