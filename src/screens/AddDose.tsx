import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'
import { BUILTIN_COMPOUNDS, CATEGORY_COLORS } from '../data/compounds'
import { toHexColor, CYAN_PRIMARY, NEON_GREEN } from '../lib/theme'
import { format } from 'date-fns'
import type { Vial } from '../types/index'

const INJECTION_SITES = [
  'Left Deltoid', 'Right Deltoid', 'Left Glute', 'Right Glute',
  'Left Quad', 'Right Quad', 'Left Abdomen', 'Right Abdomen',
  'Left VG', 'Right VG', 'Left Lat', 'Right Lat',
]

const MOOD_OPTIONS = ['Happy', 'Sad', 'Excited', 'Anxious', 'Calm', 'Irritable', 'Euphoric', 'Neutral', 'Stressed', 'Content']
const MENTAL_OPTIONS = ['Focused', 'Alert', 'Drowsy', 'Non-Drowsy', 'Anxiety', 'Depression', 'Emotional', 'Brain Fog', 'Motivated', 'Apathetic']

// ── Syringe ───────────────────────────────────────────────────────────────────
function SyringeSlider({
  concentrationMgPerMl,
  doseUnit,
  liquidColor,
  isInsulin,
  capacityMl,
  valueMl,
  onChangeMl,
}: {
  concentrationMgPerMl: number
  doseUnit: string
  liquidColor: string
  isInsulin: boolean
  capacityMl: number
  valueMl: number
  onChangeMl: (ml: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 340, H = 130
  const barrelL = W * 0.18, barrelR = W * 0.82
  const barrelT = H * 0.28, barrelB = H * 0.62
  const barrelW = barrelR - barrelL, barrelH = barrelB - barrelT
  const fill = Math.min(valueMl / capacityMl, 1)

  const plungerX = barrelL - barrelW * fill
  const handleX = Math.max(plungerX - W * 0.02, 0)
  const rodRight = barrelL + barrelW * (1 - fill)
  const liquidLeft = rodRight + 6
  const currentX = rodRight

  // Drag handling
  const dragging = useRef(false)

  const fractFromX = useCallback((clientX: number) => {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const scaleX = W / rect.width
    const x = (clientX - rect.left) * scaleX
    // reversed: left = more, right = less
    return 1 - Math.max(0, Math.min(1, (x - barrelL) / barrelW))
  }, [])

  const applyFraction = useCallback((frac: number) => {
    const raw = frac * capacityMl
    const step = isInsulin ? 0.5 / 100 : (capacityMl <= 1 ? 0.025 : 0.05)
    const snapped = Math.round(raw / step) * step
    onChangeMl(Math.max(0, Math.min(capacityMl, snapped)))
  }, [capacityMl, isInsulin, onChangeMl])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragging.current = true
    ;(e.target as Element).setPointerCapture(e.pointerId)
    applyFraction(fractFromX(e.clientX))
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    applyFraction(fractFromX(e.clientX))
  }
  const onPointerUp = () => { dragging.current = false }

  // Dose readout
  const doseMg = valueMl * concentrationMgPerMl
  const doseMcg = doseMg * 1000
  const showMcg = doseUnit === 'mcg' || (doseMg < 1 && doseUnit !== 'mg')
  const doseDisplay = showMcg
    ? doseMcg.toFixed(0)
    : doseMg >= 100 ? doseMg.toFixed(0) : doseMg.toFixed(1)
  const doseDisplayUnit = showMcg ? 'mcg' : 'mg'

  // Arrow step
  const step = isInsulin ? 0.5 / 100 : (capacityMl <= 1 ? 0.025 : 0.05)

  // Tick marks
  const ticks: { x: number; major: boolean; biggest: boolean; label?: string }[] = []
  if (isInsulin) {
    const totalU = 100
    for (let i = 0; i <= totalU; i += 1) {
      const major = i % 10 === 0
      const frac = i / totalU
      ticks.push({ x: barrelL + barrelW * frac, major, biggest: major, label: major ? String(totalU - i) : undefined })
    }
  } else {
    const tenths = capacityMl * 10
    for (let i = 0; i <= tenths; i++) {
      const frac = i / tenths
      const isHalf = i % 5 === 0
      const isWhole = i % 10 === 0
      const mlVal = (tenths - i) / 10
      ticks.push({
        x: barrelL + barrelW * frac,
        major: isHalf,
        biggest: isWhole,
        label: isHalf ? (mlVal === Math.floor(mlVal) ? String(mlVal.toFixed(0)) : mlVal.toFixed(1)) : undefined,
      })
    }
  }

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Readout row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: 8 }}>
        {isInsulin && (
          <>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: CYAN_PRIMARY, fontWeight: 700, fontSize: 20, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {(valueMl * 100).toFixed(1)}
              </p>
              <p style={{ color: '#6C757D', fontSize: 11, margin: 0 }}>Units</p>
            </div>
            <span style={{ color: '#444', fontSize: 14 }}>→</span>
          </>
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: isInsulin ? '#fff' : CYAN_PRIMARY, fontWeight: 700, fontSize: 20, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {valueMl.toFixed(2)} ml
          </p>
          <p style={{ color: '#6C757D', fontSize: 11, margin: 0 }}>Volume</p>
        </div>
        <span style={{ color: '#444', fontSize: 14 }}>→</span>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: NEON_GREEN, fontWeight: 700, fontSize: 20, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {doseDisplay}
          </p>
          <p style={{ color: '#6C757D', fontSize: 11, margin: 0 }}>{doseDisplayUnit}</p>
        </div>
      </div>

      {/* SVG Syringe */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', cursor: 'ew-resize', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Plunger handle */}
        <rect x={handleX} y={H * 0.2} width={W * 0.02} height={H * 0.5} rx={4} fill="#ADB5BD" />
        {/* Plunger rod */}
        {rodRight > handleX + W * 0.02 && (
          <rect x={handleX + W * 0.02} y={H * 0.40} width={rodRight - handleX - W * 0.02} height={H * 0.1} fill="rgba(173,181,189,0.7)" />
        )}
        {/* Plunger stopper */}
        <rect x={rodRight - 4} y={barrelT + 2} width={8} height={barrelH - 4} rx={2} fill="rgba(173,181,189,0.85)" />

        {/* Barrel outline */}
        <rect x={barrelL} y={barrelT} width={barrelW} height={barrelH} rx={6} fill="none" stroke="#ADB5BD" strokeWidth={2} />

        {/* Liquid fill */}
        {fill > 0 && liquidLeft < barrelR - 2 && (
          <rect x={liquidLeft} y={barrelT + 2} width={barrelR - 2 - liquidLeft} height={barrelH - 4} rx={4}
            fill={liquidColor + '80'} />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => {
          const tickLen = t.biggest ? H * 0.12 : t.major ? H * 0.09 : H * 0.06
          const alpha = t.biggest ? 1 : t.major ? 0.9 : 0.6
          const sw = t.biggest ? 2.5 : t.major ? 2 : 1
          return (
            <g key={i}>
              <line x1={t.x} y1={barrelT - tickLen} x2={t.x} y2={barrelT} stroke={`rgba(255,255,255,${alpha})`} strokeWidth={sw} />
              <line x1={t.x} y1={barrelB} x2={t.x} y2={barrelB + tickLen} stroke={`rgba(255,255,255,${alpha})`} strokeWidth={sw} />
              {t.label && (
                <text x={t.x} y={barrelB + tickLen + 10} textAnchor="middle" fontSize={t.biggest ? 9 : 7}
                  fill={t.biggest ? 'white' : 'rgba(255,255,255,0.7)'} fontWeight={t.biggest ? 'bold' : 'normal'}>
                  {t.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Current position indicator */}
        <line x1={currentX} y1={barrelT - H * 0.12} x2={currentX} y2={barrelB + H * 0.12}
          stroke={NEON_GREEN} strokeWidth={2} />

        {/* Needle hub */}
        <path d={`M${barrelR},${barrelT + barrelH * 0.2} L${barrelR},${barrelB - barrelH * 0.2} L${W * 0.87},${H * 0.47} L${W * 0.87},${H * 0.43} Z`}
          fill="#ADB5BD" />
        {/* Needle */}
        <line x1={W * 0.87} y1={H * 0.45} x2={W * 0.98} y2={H * 0.45} stroke="rgba(173,181,189,0.9)" strokeWidth={1.5} />
      </svg>

      {/* Precise arrows */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onChangeMl(Math.min(capacityMl, valueMl + step))}
          style={{ background: 'rgba(205,250,65,0.12)', border: `1px solid ${CYAN_PRIMARY}44`, borderRadius: 8, padding: '4px 12px', color: CYAN_PRIMARY, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>
          ‹
        </button>
        <p style={{ color: '#ADB5BD', fontSize: 12, margin: 0, minWidth: 120, textAlign: 'center' }}>
          {isInsulin
            ? `Precise: ${(valueMl * 100).toFixed(1)} units`
            : `Precise: ${valueMl.toFixed(3)} ml`}
        </p>
        <button
          onClick={() => onChangeMl(Math.max(0, valueMl - step))}
          style={{ background: 'rgba(205,250,65,0.12)', border: `1px solid ${CYAN_PRIMARY}44`, borderRadius: 8, padding: '4px 12px', color: CYAN_PRIMARY, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>
          ›
        </button>
      </div>
    </div>
  )
}

// ── Rating slider ─────────────────────────────────────────────────────────────
function RatingSlider({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const pct = ((value ?? 0) / 5) * 100
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-xs font-semibold" style={{ color: CYAN_PRIMARY }}>{value ? `${value} / 5` : '—'}</p>
      </div>
      <input type="range" min={0} max={5} step={1} value={value ?? 0}
        onChange={e => { const v = parseInt(e.target.value); onChange(v === 0 ? null : v) }}
        className="w-full cursor-pointer"
        style={{ accentColor: CYAN_PRIMARY, background: `linear-gradient(to right, ${CYAN_PRIMARY} ${pct}%, rgba(255,255,255,0.12) ${pct}%)`, height: 4, borderRadius: 4, appearance: 'none' }} />
    </div>
  )
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-text-secondary">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o} onClick={() => onChange(value === o ? '' : o)}
            className="px-2.5 py-1 rounded-full text-xs transition-colors"
            style={{
              background: value === o ? 'rgba(205,250,65,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${value === o ? CYAN_PRIMARY : 'rgba(255,255,255,0.1)'}`,
              color: value === o ? CYAN_PRIMARY : '#ADB5BD',
            }}>{o}</button>
        ))}
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AddDose() {
  const navigate = useNavigate()
  const { user, doseLogs, vials } = useStore()

  const [selectedCompound, setSelectedCompound] = useState<typeof BUILTIN_COMPOUNDS[0] | null>(null)
  const [selectedVial, setSelectedVial] = useState<Vial | null>(null)
  const [doseValue, setDoseValue] = useState('')
  const [doseUnit, setDoseUnit] = useState('mcg')
  const [valueMl, setValueMl] = useState(0)
  const [site, setSite] = useState('')
  const [notes, setNotes] = useState('')
  const [dateTime, setDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [search, setSearch] = useState('')
  const [step, setStep] = useState<'select' | 'log'>('select')
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState('ALL')
  const [showAttr, setShowAttr] = useState(true)
  const [showVialPicker, setShowVialPicker] = useState(false)

  const [mood, setMood] = useState('')
  const [mentalState, setMentalState] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [sleepQuality, setSleepQuality] = useState<number | null>(null)
  const [sleepHours, setSleepHours] = useState('')
  const [erectionQuality, setErectionQuality] = useState<number | null>(null)
  const [libido, setLibido] = useState<number | null>(null)
  const [irritation, setIrritation] = useState<number | null>(null)
  const [nippleSensitivity, setNippleSensitivity] = useState<number | null>(null)
  const [morningWood, setMorningWood] = useState<number | null>(null)
  const [attrNotes, setAttrNotes] = useState('')

  const vialColors = useMemo(() =>
    vials.reduce((acc, v) => {
      if (v.color != null && v.compoundName && !acc[v.compoundName]) acc[v.compoundName] = toHexColor(v.color)
      return acc
    }, {} as Record<string, string>),
    [vials]
  )

  const recentPresets = useMemo(() => {
    const seen = new Set<string>()
    const result: { compoundName: string; doseDisplayValue: number; doseDisplayUnit: string; injectionSite?: string }[] = []
    for (const log of doseLogs) {
      const key = `${log.compoundName}|${log.doseDisplayValue}|${log.doseDisplayUnit}`
      if (!seen.has(key)) { seen.add(key); result.push({ compoundName: log.compoundName, doseDisplayValue: log.doseDisplayValue, doseDisplayUnit: log.doseDisplayUnit, injectionSite: log.injectionSite }) }
      if (result.length >= 3) break
    }
    return result
  }, [doseLogs])

  // Vials matching the selected compound
  const compoundVials = useMemo(() =>
    selectedCompound
      ? vials.filter(v => v.isActive && v.compoundName === selectedCompound.name && v.concentrationMgPerMl)
      : [],
    [vials, selectedCompound]
  )

  // Syringe params derived from selected vial
  const syringeParams = useMemo(() => {
    if (!selectedVial?.concentrationMgPerMl) return null
    const conc = selectedVial.concentrationMgPerMl
    const totalMl = selectedVial.bacWaterMl ?? 1
    // Use insulin syringe (100 units = 1ml) for peptides <10mg/ml conc, else ml syringe
    const isInsulin = conc < 10
    const capacityMl = isInsulin ? 1 : Math.min(Math.ceil(totalMl), 3)
    return { conc, isInsulin, capacityMl, totalMl }
  }, [selectedVial])

  const categories = ['ALL', 'TRT', 'AAS', 'PEPTIDE', 'SARM', 'AI', 'SERM', 'OTHER', 'MEDICATION', 'SUPPLEMENT']
  const filtered = BUILTIN_COMPOUNDS.filter(c =>
    (category === 'ALL' || c.category === category) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectCompound = (c: typeof BUILTIN_COMPOUNDS[0]) => {
    setSelectedCompound(c)
    setDoseUnit(c.defaultDoseUnit)
    setSelectedVial(null)
    setValueMl(0)
    setDoseValue('')
    setStep('log')
  }

  const handleSelectPreset = (preset: typeof recentPresets[0]) => {
    const compound = BUILTIN_COMPOUNDS.find(c => c.name === preset.compoundName)
    if (compound) {
      setSelectedCompound(compound)
      setDoseValue(String(preset.doseDisplayValue))
      setDoseUnit(preset.doseDisplayUnit)
      setSite(preset.injectionSite || '')
      setStep('log')
    }
  }

  const handleSelectVial = (v: Vial) => {
    setSelectedVial(v)
    setValueMl(0)
    setDoseValue('')
    setShowVialPicker(false)
  }

  // When syringe ml changes, sync the text dose value
  const handleMlChange = (ml: number) => {
    setValueMl(ml)
    if (syringeParams) {
      const doseMg = ml * syringeParams.conc
      if (doseUnit === 'mcg') setDoseValue((doseMg * 1000).toFixed(0))
      else if (doseUnit === 'IU') setDoseValue((doseMg / 0.333).toFixed(1))
      else setDoseValue(doseMg >= 100 ? doseMg.toFixed(0) : doseMg.toFixed(1))
    }
  }

  const handleSave = async () => {
    if (!user || !selectedCompound || !doseValue) return
    setSaving(true)
    try {
      const dtMs = new Date(dateTime).getTime()
      const displayVal = parseFloat(doseValue)
      let doseMg = displayVal
      if (doseUnit === 'mcg') doseMg = displayVal / 1000
      else if (doseUnit === 'IU') doseMg = displayVal * 0.333

      await addDoc(collection(db, 'users', user.uid, 'dose_logs'), {
        compoundId: selectedCompound.id,
        compoundName: selectedCompound.name,
        doseMg,
        doseDisplayValue: displayVal,
        doseDisplayUnit: doseUnit,
        dateTime: dtMs,
        injectionSite: site || null,
        notes: notes || null,
        vialId: selectedVial?.id || null,
        userId: user.uid,
        createdAt: Date.now(),
        mood: mood || null,
        mentalState: mentalState || null,
        energyLevel: energy,
        sleepQuality,
        sleepHours: sleepHours ? parseFloat(sleepHours) : null,
        erectionQuality,
        libidoQuality: libido,
        irritationAggression: irritation,
        nippleSensitivity,
        morningWood,
        attributeNotes: attrNotes || null,
      })
      navigate('/dose-log')
    } finally {
      setSaving(false)
    }
  }

  // ── Step 1: compound select ─────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="screen-enter space-y-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-text-secondary p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl font-bold text-text-primary">Select Compound</h1>
        </div>

        {recentPresets.length > 0 && (
          <div>
            <p className="text-text-tertiary text-xs font-bold tracking-widest mb-2 px-1">RECENT PRESETS</p>
            <div className="grid grid-cols-3 gap-2">
              {recentPresets.map((p, i) => {
                const color = vialColors[p.compoundName] || CYAN_PRIMARY
                return (
                  <button key={i} onClick={() => handleSelectPreset(p)}
                    className="glossy-card text-center p-3 active:scale-95 transition-transform">
                    <p className="text-xs font-semibold truncate" style={{ color }}>{p.compoundName}</p>
                    <p className="text-text-secondary text-xs mt-0.5">{p.doseDisplayValue} {p.doseDisplayUnit}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-dark-variant border border-dark-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:border-cyan-primary transition-colors" />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat ? 'bg-cyan-primary text-dark-bg' : 'bg-dark-variant border border-dark-border text-text-secondary'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(c => {
            const color = vialColors[c.name] || CATEGORY_COLORS[c.category]
            return (
              <button key={c.id} onClick={() => handleSelectCompound(c)}
                className="w-full glossy-card text-left active:scale-[0.99] transition-transform">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{c.name}</p>
                    <p className="text-text-tertiary text-xs">{c.category} · {c.defaultDoseUnit} · t½ {c.halfLifeHours}h</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#546E7A" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Step 2: log dose ────────────────────────────────────────────────────────
  const liquidColor = selectedVial ? toHexColor(selectedVial.color ?? null) : (vialColors[selectedCompound!.name] || CYAN_PRIMARY)

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('select')} className="text-text-secondary p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-text-primary">Log Dose</h1>
      </div>

      {/* Compound header */}
      <div className="glossy-card">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: vialColors[selectedCompound!.name] || CATEGORY_COLORS[selectedCompound!.category] }} />
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold">{selectedCompound!.name}</p>
            <p className="text-text-tertiary text-xs">{selectedCompound!.category} · t½ {selectedCompound!.halfLifeHours}h</p>
          </div>
          <button onClick={() => setStep('select')} className="text-xs" style={{ color: CYAN_PRIMARY }}>Change</button>
        </div>
      </div>

      {/* Vial selector */}
      <div className="glossy-card space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-text-primary font-semibold text-sm">Vial</p>
          {compoundVials.length > 0 && (
            <button onClick={() => setShowVialPicker(!showVialPicker)} className="text-xs" style={{ color: CYAN_PRIMARY }}>
              {showVialPicker ? 'Close' : 'Select'}
            </button>
          )}
        </div>

        {compoundVials.length === 0 ? (
          <p className="text-text-tertiary text-xs">No active vials for this compound. <button onClick={() => navigate('/vials')} className="underline" style={{ color: CYAN_PRIMARY }}>Add a vial</button></p>
        ) : selectedVial ? (
          <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${liquidColor}33` }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: liquidColor }} />
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium">{selectedVial.labelText || selectedVial.compoundName}</p>
              <p className="text-text-tertiary text-xs">
                {selectedVial.concentrationMgPerMl?.toFixed(1)} mg/ml · {selectedVial.remainingAmountMg?.toFixed(0)} mg remaining
              </p>
            </div>
            <button onClick={() => { setSelectedVial(null); setValueMl(0); setDoseValue('') }} className="text-xs text-text-tertiary">✕</button>
          </div>
        ) : (
          <button onClick={() => setShowVialPicker(true)}
            className="w-full py-2.5 rounded-xl text-sm text-text-secondary border border-dark-border text-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            Tap to select a vial
          </button>
        )}

        {showVialPicker && (
          <div className="space-y-1 mt-1">
            {compoundVials.map(v => {
              const c = toHexColor(v.color ?? null)
              return (
                <button key={v.id} onClick={() => handleSelectVial(v)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:scale-[0.99] transition-transform"
                  style={{ background: selectedVial?.id === v.id ? `${c}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${selectedVial?.id === v.id ? c : 'rgba(255,255,255,0.08)'}` }}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm">{v.labelText || v.compoundName}</p>
                    <p className="text-text-tertiary text-xs">{v.concentrationMgPerMl?.toFixed(1)} mg/ml · {v.remainingAmountMg?.toFixed(0)} mg left</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Syringe OR manual input */}
      {selectedVial && syringeParams ? (
        <div className="glossy-card">
          <p className="text-text-primary font-semibold text-sm mb-3">Dose Amount</p>
          <SyringeSlider
            concentrationMgPerMl={syringeParams.conc}
            doseUnit={doseUnit}
            liquidColor={liquidColor}
            isInsulin={syringeParams.isInsulin}
            capacityMl={syringeParams.capacityMl}
            valueMl={valueMl}
            onChangeMl={handleMlChange}
          />
          {/* Unit toggle */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {['mcg', 'mg', 'IU', 'ml'].map(u => (
              <button key={u} onClick={() => setDoseUnit(u)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: doseUnit === u ? CYAN_PRIMARY : 'rgba(255,255,255,0.06)',
                  color: doseUnit === u ? '#0A0E14' : '#ADB5BD',
                }}>
                {u}
              </button>
            ))}
          </div>
          {doseValue && (
            <p className="text-text-tertiary text-xs mt-2">Dose: {doseValue} {doseUnit}</p>
          )}
        </div>
      ) : (
        <div className="glossy-card space-y-3">
          <p className="text-text-primary font-semibold text-sm">Dose Amount</p>
          <div className="flex gap-2">
            <input type="number" value={doseValue} onChange={e => setDoseValue(e.target.value)} placeholder="0"
              className="flex-1 bg-dark-variant border border-dark-border rounded-xl px-4 py-2.5 text-text-primary text-lg font-semibold focus:border-cyan-primary transition-colors" />
            <select value={doseUnit} onChange={e => setDoseUnit(e.target.value)}
              className="bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary">
              {['mcg', 'mg', 'IU', 'ml'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="glossy-card space-y-2">
        <p className="text-text-primary font-semibold text-sm">Date & Time</p>
        <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)}
          className="w-full bg-dark-variant border border-dark-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:border-cyan-primary transition-colors" />
      </div>

      <div className="glossy-card space-y-2">
        <p className="text-text-primary font-semibold text-sm">Injection Site (optional)</p>
        <div className="flex flex-wrap gap-2">
          {INJECTION_SITES.map(s => (
            <button key={s} onClick={() => setSite(site === s ? '' : s)}
              className="px-3 py-1.5 rounded-full text-xs transition-colors"
              style={{
                background: site === s ? 'rgba(205,250,65,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${site === s ? CYAN_PRIMARY : 'rgba(255,255,255,0.1)'}`,
                color: site === s ? CYAN_PRIMARY : '#ADB5BD',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glossy-card space-y-2">
        <p className="text-text-primary font-semibold text-sm">Notes (optional)</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={2}
          className="w-full bg-dark-variant border border-dark-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:border-cyan-primary transition-colors resize-none" />
      </div>

      <div className="glossy-card space-y-3">
        <button onClick={() => setShowAttr(!showAttr)} className="w-full flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: CYAN_PRIMARY }}>Post-Dose Feelings</p>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={CYAN_PRIMARY} strokeWidth="2"
            className={`transition-transform ${showAttr ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        {showAttr && (
          <div className="space-y-4 pt-1">
            <ChipGroup label="Mood" options={MOOD_OPTIONS} value={mood} onChange={setMood} />
            <ChipGroup label="Mental State" options={MENTAL_OPTIONS} value={mentalState} onChange={setMentalState} />
            <RatingSlider label="Energy" value={energy} onChange={setEnergy} />
            <RatingSlider label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} />
            <div>
              <p className="text-xs text-text-secondary mb-1">Sleep Hours</p>
              <input type="number" step="0.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="e.g. 7.5"
                className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2 text-text-primary text-sm focus:border-cyan-primary" />
            </div>
            <RatingSlider label="Erection Quality" value={erectionQuality} onChange={setErectionQuality} />
            <RatingSlider label="Libido" value={libido} onChange={setLibido} />
            <RatingSlider label="Irritation / Aggression" value={irritation} onChange={setIrritation} />
            <RatingSlider label="Nipple Itch / Tenderness" value={nippleSensitivity} onChange={setNippleSensitivity} />
            <RatingSlider label="Morning Wood" value={morningWood} onChange={setMorningWood} />
            <div>
              <p className="text-xs text-text-secondary mb-1">Attribute Notes (optional)</p>
              <textarea value={attrNotes} onChange={e => setAttrNotes(e.target.value)} rows={2}
                placeholder="Additional observations..."
                className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2 text-text-primary text-sm focus:border-cyan-primary resize-none" />
            </div>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving || !doseValue}
        className="w-full font-bold py-3.5 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
        style={{ background: CYAN_PRIMARY, color: '#0A0E14' }}>
        {saving ? 'Saving...' : 'Save Dose'}
      </button>
    </div>
  )
}
