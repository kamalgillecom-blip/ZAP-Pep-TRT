import { useState, useRef } from 'react'
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'
import { format } from 'date-fns'
import { CYAN_PRIMARY } from '../lib/theme'

interface Marker { name: string; value: string; unit: string; low: string; high: string }

// Grouped units for USA + Canada
const UNIT_GROUPS = [
  {
    label: '🇺🇸 USA (Conventional)',
    units: ['ng/dL', 'pg/mL', 'ng/mL', 'nmol/L', '%', 'g/dL', 'K/µL', 'M/µL',
      'mg/dL', 'mIU/mL', 'µIU/mL', 'U/L', 'µg/dL', 'fL', 'pg', 'ratio'],
  },
  {
    label: '🇨🇦 Canada (SI Units)',
    units: ['nmol/L', 'pmol/L', 'µg/L', 'mmol/L', 'µmol/L', 'g/L',
      'x10⁹/L', 'x10¹²/L', 'IU/L', 'mIU/L', 'mU/L'],
  },
]
const ALL_UNITS = UNIT_GROUPS.flatMap(g => g.units)

const TRT_PANEL: Marker[] = [
  { name: 'Total Testosterone', value: '', unit: 'ng/dL', low: '264', high: '916' },
  { name: 'Free Testosterone', value: '', unit: 'pg/mL', low: '6.8', high: '21.5' },
  { name: 'Estradiol (E2)', value: '', unit: 'pg/mL', low: '7.6', high: '42.6' },
  { name: 'SHBG', value: '', unit: 'nmol/L', low: '16.5', high: '55.9' },
  { name: 'Hematocrit', value: '', unit: '%', low: '37.5', high: '51.0' },
  { name: 'Hemoglobin', value: '', unit: 'g/dL', low: '12.6', high: '17.7' },
  { name: 'PSA', value: '', unit: 'ng/mL', low: '0', high: '4.0' },
]

const PRESET_PANELS: Record<string, Marker[]> = {
  'TRT Panel': TRT_PANEL,
  'Liver Panel': [
    { name: 'ALT', value: '', unit: 'U/L', low: '7', high: '56' },
    { name: 'AST', value: '', unit: 'U/L', low: '10', high: '40' },
    { name: 'GGT', value: '', unit: 'U/L', low: '0', high: '65' },
    { name: 'ALP', value: '', unit: 'U/L', low: '44', high: '147' },
  ],
  'Lipids': [
    { name: 'Total Cholesterol', value: '', unit: 'mg/dL', low: '0', high: '200' },
    { name: 'LDL', value: '', unit: 'mg/dL', low: '0', high: '100' },
    { name: 'HDL', value: '', unit: 'mg/dL', low: '40', high: '60' },
    { name: 'Triglycerides', value: '', unit: 'mg/dL', low: '0', high: '150' },
  ],
  'CBC': [
    { name: 'WBC', value: '', unit: 'K/µL', low: '4.5', high: '11.0' },
    { name: 'RBC', value: '', unit: 'M/µL', low: '4.5', high: '5.5' },
    { name: 'Hemoglobin', value: '', unit: 'g/dL', low: '12.6', high: '17.7' },
    { name: 'Hematocrit', value: '', unit: '%', low: '37.5', high: '51.0' },
    { name: 'Platelets', value: '', unit: 'K/µL', low: '150', high: '400' },
  ],
  'Hormones': [
    { name: 'LH', value: '', unit: 'mIU/mL', low: '1.7', high: '8.6' },
    { name: 'FSH', value: '', unit: 'mIU/mL', low: '1.5', high: '12.4' },
    { name: 'Prolactin', value: '', unit: 'ng/mL', low: '2.0', high: '18.0' },
    { name: 'DHEA-S', value: '', unit: 'µg/dL', low: '80', high: '560' },
    { name: 'Cortisol', value: '', unit: 'µg/dL', low: '6', high: '23' },
    { name: 'IGF-1', value: '', unit: 'ng/mL', low: '115', high: '355' },
  ],
  'Thyroid': [
    { name: 'TSH', value: '', unit: 'mIU/mL', low: '0.4', high: '4.0' },
    { name: 'Free T3', value: '', unit: 'pg/mL', low: '2.3', high: '4.2' },
    { name: 'Free T4', value: '', unit: 'ng/dL', low: '0.8', high: '1.8' },
  ],
  'Metabolic': [
    { name: 'Glucose', value: '', unit: 'mg/dL', low: '70', high: '100' },
    { name: 'HbA1c', value: '', unit: '%', low: '0', high: '5.7' },
    { name: 'Creatinine', value: '', unit: 'mg/dL', low: '0.6', high: '1.2' },
    { name: 'BUN', value: '', unit: 'mg/dL', low: '7', high: '25' },
    { name: 'eGFR', value: '', unit: 'mL/min', low: '60', high: '120' },
  ],
}

const MARKER_REGEX = /^([A-Za-z][\w\s\-()%/]+?)\s+([\d.]+)\s*([A-Za-z/%]+(?:\/[A-Za-z]+)?)\s*(?:([\d.]+)\s*[-–]\s*([\d.]+))?/

function parseOcrText(text: string): Marker[] {
  const results: Marker[] = []
  text.split('\n').forEach(line => {
    const trimmed = line.trim()
    const match = MARKER_REGEX.exec(trimmed)
    if (!match) return
    const name = match[1].trim()
    if (name.length < 2 || name.length > 40 || !match[2]) return
    results.push({ name, value: match[2], unit: match[3] || '', low: match[4] || '', high: match[5] || '' })
  })
  return results
}

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isCustom = value && !ALL_UNITS.includes(value)
  return (
    <select
      value={isCustom ? '__custom__' : value}
      onChange={e => {
        if (e.target.value !== '__custom__') onChange(e.target.value)
      }}
      className="w-28 bg-dark-bg border border-dark-border rounded-lg px-2 py-1.5 text-text-primary text-xs focus:border-cyan-primary"
    >
      <option value="">Unit</option>
      {UNIT_GROUPS.map(g => (
        <optgroup key={g.label} label={g.label}>
          {g.units.map(u => <option key={u} value={u}>{u}</option>)}
        </optgroup>
      ))}
      {isCustom && <option value="__custom__">{value}</option>}
    </select>
  )
}

export default function Bloodwork() {
  const { bloodWork, user } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [addedPanel, setAddedPanel] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [labName, setLabName] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  // Default to TRT Panel
  const [markers, setMarkers] = useState<Marker[]>(TRT_PANEL.map(m => ({ ...m })))

  const updateMarker = (i: number, field: keyof Marker, val: string) =>
    setMarkers(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))

  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true); setScanError(null)
    try {
      const Tesseract = await import('tesseract.js')
      const result = await Tesseract.recognize(file, 'eng')
      const parsed = parseOcrText(result.data.text)
      if (parsed.length > 0) {
        setMarkers(prev => [...prev.filter(m => m.name), ...parsed])
      } else {
        setScanError('No markers detected. Try a clearer image or enter values manually.')
      }
    } catch {
      setScanError('Scan failed. Please enter values manually.')
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleAddPreset = (panelName: string, panel: Marker[]) => {
    setMarkers(prev => [...prev.filter(m => m.name && m.value), ...panel.map(m => ({ ...m }))])
    setAddedPanel(panelName)
    setTimeout(() => setAddedPanel(null), 2500)
  }

  const handleSave = async () => {
    if (!user) return
    const filledMarkers = markers.filter(m => m.name && m.value)
    if (!filledMarkers.length) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'users', user.uid, 'blood_work'), {
        date: new Date(date).getTime(),
        labName: labName || null,
        markers: filledMarkers.map(m => ({
          markerName: m.name,
          value: parseFloat(m.value),
          unit: m.unit,
          referenceRangeLow: m.low ? parseFloat(m.low) : null,
          referenceRangeHigh: m.high ? parseFloat(m.high) : null,
          isOutOfRange: m.value && m.low && m.high
            ? parseFloat(m.value) < parseFloat(m.low) || parseFloat(m.value) > parseFloat(m.high)
            : false,
        })),
        userId: user.uid,
        createdAt: Date.now(),
      })
      setShowAdd(false)
      setMarkers(TRT_PANEL.map(m => ({ ...m })))
      setLabName(''); setDate(format(new Date(), 'yyyy-MM-dd'))
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setShowAdd(false)
    setMarkers(TRT_PANEL.map(m => ({ ...m })))
    setLabName(''); setDate(format(new Date(), 'yyyy-MM-dd'))
    setScanError(null); setAddedPanel(null)
  }

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Blood Work</h1>
        <button onClick={() => setShowAdd(true)}
          className="bg-cyan-primary text-dark-bg text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform">
          + Add
        </button>
      </div>

      {bloodWork.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No blood work logged</p>
          <p className="text-text-tertiary text-sm mt-1">Track your lab results over time</p>
        </div>
      )}

      <div className="space-y-2">
        {bloodWork.map(bw => {
          const outOfRange = (bw.markers || []).filter((m: any) => m.isOutOfRange).length
          const isExp = expanded === bw.id
          return (
            <div key={bw.id} className="glossy-card">
              <button onClick={() => setExpanded(isExp ? null : bw.id)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-primary font-semibold text-sm">{bw.labName || 'Blood Panel'}</p>
                    <p className="text-text-tertiary text-xs">{format(new Date(bw.date), 'MMMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {outOfRange > 0 && (
                      <span className="text-xs bg-status-red/20 text-status-red px-2 py-0.5 rounded-full">{outOfRange} flagged</span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#546E7A" strokeWidth="2"
                      className={`transition-transform ${isExp ? 'rotate-90' : ''}`}>
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              </button>
              {isExp && (
                <div className="mt-3 pt-3 border-t border-dark-border space-y-2">
                  {(bw.markers || []).map((m: any, i: number) => {
                    const pct = m.referenceRangeLow != null && m.referenceRangeHigh != null
                      ? Math.max(0, Math.min(100, ((m.value - m.referenceRangeLow) / (m.referenceRangeHigh - m.referenceRangeLow)) * 100))
                      : null
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-text-secondary text-xs">{m.markerName}</span>
                          <span className={`text-sm font-semibold ${m.isOutOfRange ? 'text-status-red' : 'text-status-green'}`}>
                            {m.value} {m.unit}
                          </span>
                        </div>
                        {pct !== null && (
                          <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: m.isOutOfRange ? '#F44336' : '#4CAF50' }} />
                          </div>
                        )}
                        {m.referenceRangeLow != null && (
                          <div className="flex justify-between text-xs text-text-tertiary mt-0.5">
                            <span>{m.referenceRangeLow}</span><span>{m.referenceRangeHigh}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button onClick={async () => {
                    if (!user) return
                    await deleteDoc(doc(db, 'users', user.uid, 'blood_work', bw.id))
                    setExpanded(null)
                  }} className="text-status-red/60 text-xs mt-2">Delete entry</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleClose}>
          <div className="w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="glossy-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-semibold text-base">Log Blood Work</p>
                <button onClick={handleClose} className="text-text-tertiary">✕</button>
              </div>

              {/* AI Scan */}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleScanImage} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={scanning}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
                style={{ background: scanning ? 'rgba(149,117,205,0.3)' : 'rgba(149,117,205,0.2)', border: '1px solid rgba(149,117,205,0.5)', color: '#CE93D8' }}>
                {scanning ? (
                  <><div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />Scanning lab report...</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>Scan Lab Report with AI</>
                )}
              </button>
              {scanError && <p className="text-status-red text-xs">{scanError}</p>}

              {/* Quick preset panels */}
              <div>
                <p className="text-text-secondary text-xs font-medium mb-2">Quick Add Panel:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRESET_PANELS).map(([name, panel]) => (
                    <button key={name} onClick={() => handleAddPreset(name, panel)}
                      className="px-3 py-1 rounded-full text-xs transition-colors"
                      style={{
                        border: `1px solid ${addedPanel === name ? CYAN_PRIMARY : 'rgba(255,255,255,0.15)'}`,
                        color: addedPanel === name ? CYAN_PRIMARY : '#ADB5BD',
                        background: addedPanel === name ? 'rgba(205,250,65,0.1)' : 'transparent',
                      }}>
                      {addedPanel === name ? '✓ Added below' : name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Lab Name</label>
                  <input value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. Quest Diagnostics"
                    className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2 text-text-primary text-sm focus:border-cyan-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="bg-dark-variant border border-dark-border rounded-xl px-3 py-2 text-text-primary text-sm focus:border-cyan-primary" />
                </div>
              </div>

              {/* Marker rows */}
              <div className="space-y-3">
                {markers.map((m, i) => (
                  <div key={i} className="bg-dark-variant rounded-xl p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input value={m.name} onChange={e => updateMarker(i, 'name', e.target.value)}
                        placeholder="Marker name (e.g. Testosterone)"
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:border-cyan-primary" />
                      <button onClick={() => setMarkers(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-status-red/60 hover:text-status-red text-lg leading-none">×</button>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" value={m.value} onChange={e => updateMarker(i, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:border-cyan-primary" />
                      <UnitSelect value={m.unit} onChange={v => updateMarker(i, 'unit', v)} />
                    </div>
                    <div className="flex gap-2">
                      <input type="number" value={m.low} onChange={e => updateMarker(i, 'low', e.target.value)}
                        placeholder="Ref Low"
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-text-tertiary text-xs focus:border-cyan-primary" />
                      <input type="number" value={m.high} onChange={e => updateMarker(i, 'high', e.target.value)}
                        placeholder="Ref High"
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-text-tertiary text-xs focus:border-cyan-primary" />
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setMarkers(prev => [...prev, { name: '', value: '', unit: '', low: '', high: '' }])}
                className="text-sm font-medium flex items-center gap-1" style={{ color: CYAN_PRIMARY }}>
                <span className="text-lg leading-none">+</span> Add Marker
              </button>

              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 border border-dark-border text-text-secondary py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-cyan-primary text-dark-bg font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
