import { useState } from 'react'
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'
import { BUILTIN_COMPOUNDS } from '../data/compounds'
import { format } from 'date-fns'

// Exact color palette from Android ColorPickerGrid.kt — same 40 colors, same order
const VIAL_COLORS = [
  // Row 1 - Reds/Pinks
  '#FF1744', '#FF5252', '#FF4081', '#E91E63', '#F48FB1', '#CE93D8', '#BA68C8', '#AB47BC',
  // Row 2 - Purples/Blues
  '#7C4DFF', '#651FFF', '#536DFE', '#448AFF', '#2979FF', '#0091EA', '#00B0FF', '#00E5FF',
  // Row 3 - Cyans/Greens
  '#00BCD4', '#009688', '#00BFA5', '#00E676', '#69F0AE', '#76FF03', '#AEEA00', '#FFD600',
  // Row 4 - Yellows/Oranges
  '#FFC400', '#FFAB00', '#FF9100', '#FF6D00', '#FF3D00', '#DD2C00', '#BF360C', '#8D6E63',
  // Row 5 - Browns/Grays/Neutral
  '#A1887F', '#78909C', '#90A4AE', '#B0BEC5', '#CFD8DC', '#ECEFF1', '#FFFFFF', '#607D8B',
]

export default function Vials() {
  const { vials, user } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const [compoundId, setCompoundId] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [bacWater, setBacWater] = useState('')
  const [vendor, setVendor] = useState('')
  const [expDate, setExpDate] = useState('')
  const [color, setColor] = useState(VIAL_COLORS[0])
  const [labelText, setLabelText] = useState('')

  const activeVials = vials.filter(v => v.isActive)
  const inactiveVials = vials.filter(v => !v.isActive)

  const handleAdd = async () => {
    if (!user || !compoundId || !totalAmount) return
    setSaving(true)
    try {
      const compound = BUILTIN_COMPOUNDS.find(c => c.id === compoundId)
      const total = parseFloat(totalAmount)
      const bac = parseFloat(bacWater) || 0
      const conc = bac > 0 ? total / bac : 0
      await addDoc(collection(db, 'users', user.uid, 'vials'), {
        compoundId,
        compoundName: compound?.name || '',
        totalAmountMg: total,
        remainingAmountMg: total,
        bacWaterMl: bac || null,
        concentrationMgPerMl: conc || null,
        vendor: vendor || null,
        expirationDate: expDate ? new Date(expDate).getTime() : null,
        reconstitutionDate: Date.now(),
        color,
        labelText: labelText || null,
        isActive: true,
        userId: user.uid,
      })
      setShowAdd(false)
      setCompoundId(''); setTotalAmount(''); setBacWater(''); setVendor(''); setExpDate(''); setLabelText('')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    await deleteDoc(doc(db, 'users', user.uid, 'vials', id))
  }

  const handleToggle = async (vial: typeof vials[0]) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid, 'vials', vial.id), { isActive: !vial.isActive })
  }

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Vials</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-cyan-primary text-dark-bg text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          + Add
        </button>
      </div>

      {vials.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No vials yet</p>
          <p className="text-text-tertiary text-sm mt-1">Add a vial to track your inventory</p>
        </div>
      )}

      {activeVials.length > 0 && (
        <div>
          <p className="text-text-tertiary text-xs font-medium mb-2 px-1">ACTIVE</p>
          <div className="space-y-2">
            {activeVials.map(v => <VialCard key={v.id} vial={v} onDelete={handleDelete} onToggle={handleToggle} />)}
          </div>
        </div>
      )}

      {inactiveVials.length > 0 && (
        <div>
          <p className="text-text-tertiary text-xs font-medium mb-2 px-1">INACTIVE</p>
          <div className="space-y-2">
            {inactiveVials.map(v => <VialCard key={v.id} vial={v} onDelete={handleDelete} onToggle={handleToggle} />)}
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
            <div className="glossy-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-semibold text-base">Add Vial</p>
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
                  <label className="block text-xs text-text-secondary mb-1">Total Amount (mg)</label>
                  <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                    placeholder="e.g. 10" className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">BAC Water (ml)</label>
                  <input type="number" value={bacWater} onChange={e => setBacWater(e.target.value)}
                    placeholder="e.g. 2" className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
                </div>
              </div>

              {totalAmount && bacWater && (
                <p className="text-cyan-primary text-xs">Concentration: {(parseFloat(totalAmount) / parseFloat(bacWater)).toFixed(2)} mg/ml ({(parseFloat(totalAmount) / parseFloat(bacWater) * 1000).toFixed(0)} mcg/ml)</p>
              )}

              <div>
                <label className="block text-xs text-text-secondary mb-1">Vendor (optional)</label>
                <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
                  placeholder="Vendor name" className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Expiration Date (optional)</label>
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary" />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-2">Color Label</label>
                <div className="grid gap-2 p-2 rounded-xl" style={{ gridTemplateColumns: 'repeat(8, 1fr)', background: 'rgba(255,255,255,0.04)' }}>
                  {VIAL_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className="flex items-center justify-center"
                      style={{ aspectRatio: '1' }}>
                      <div
                        className="rounded-full transition-all"
                        style={{
                          width: color === c ? '70%' : '85%',
                          aspectRatio: '1',
                          background: c,
                          outline: color === c ? '2px solid white' : 'none',
                          outlineOffset: '2px',
                          border: c === '#FFFFFF' ? '1px solid #555' : 'none',
                        }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 border border-dark-border text-text-secondary py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleAdd} disabled={saving || !compoundId || !totalAmount}
                  className="flex-1 bg-cyan-primary text-dark-bg font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Vial'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VialCard({ vial, onDelete, onToggle }: { vial: any; onDelete: (id: string) => void; onToggle: (v: any) => void }) {
  const pct = Math.max(0, Math.min(100, (vial.remainingAmountMg / vial.totalAmountMg) * 100))
  const isExpired = vial.expirationDate && vial.expirationDate < Date.now()

  return (
    <div className="glossy-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-3 h-10 rounded-full flex-shrink-0 relative overflow-hidden bg-dark-border">
            <div className="absolute bottom-0 left-0 right-0 rounded-full transition-all" style={{ height: `${pct}%`, background: vial.color || '#CDFA41' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold text-sm">{vial.compoundName}</p>
            <p className="text-text-tertiary text-xs">{vial.remainingAmountMg?.toFixed(1)} / {vial.totalAmountMg} mg remaining</p>
            {vial.concentrationMgPerMl && (
              <p className="text-cyan-light text-xs">{vial.concentrationMgPerMl.toFixed(2)} mg/ml · {(vial.concentrationMgPerMl * 1000).toFixed(0)} mcg/ml</p>
            )}
            {vial.vendor && <p className="text-text-tertiary text-xs">{vial.vendor}</p>}
            {vial.expirationDate && (
              <p className={`text-xs ${isExpired ? 'text-status-red' : 'text-text-tertiary'}`}>
                Exp: {format(new Date(vial.expirationDate), 'MMM d, yyyy')}{isExpired ? ' (Expired)' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <button onClick={() => onToggle(vial)} className={`text-xs px-2 py-1 rounded-lg ${vial.isActive ? 'bg-status-green/20 text-status-green' : 'bg-dark-border text-text-tertiary'}`}>
            {vial.isActive ? 'Active' : 'Inactive'}
          </button>
          <button onClick={() => onDelete(vial.id)} className="text-status-red/60 text-xs p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 bg-dark-border rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: vial.color || '#CDFA41' }} />
      </div>
    </div>
  )
}
