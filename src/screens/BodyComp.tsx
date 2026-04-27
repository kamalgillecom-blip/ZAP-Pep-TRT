import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'
import { format } from 'date-fns'
import { CYAN_PRIMARY } from '../lib/theme'

const C = CYAN_PRIMARY

const MEASUREMENTS = [
  { key: 'waistInches', label: 'Waist' },
  { key: 'chestInches', label: 'Chest' },
  { key: 'armLeftInches', label: 'L. Arm' },
  { key: 'armRightInches', label: 'R. Arm' },
  { key: 'thighLeftInches', label: 'L. Thigh' },
  { key: 'thighRightInches', label: 'R. Thigh' },
  { key: 'shouldersInches', label: 'Shoulders' },
  { key: 'neckInches', label: 'Neck' },
]

const POSES = ['Front', 'Back', 'Left Side', 'Right Side', 'Flexing']

const toMs = (val: any): number => {
  if (typeof val === 'number') return val
  if (val?.toMillis) return val.toMillis()
  if (val?.seconds) return val.seconds * 1000
  return new Date(val).getTime()
}

// ── Weight trend chart ────────────────────────────────────────────────────────
function WeightChart({ data }: { data: { date: string; weight: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    const PAD_L = 36, PAD_T = 8, PAD_B = 20, PAD_R = 8
    const cW = W - PAD_L - PAD_R, cH = H - PAD_T - PAD_B
    const weights = data.map(d => d.weight)
    const minW = Math.min(...weights) - 2
    const maxW = Math.max(...weights) + 2
    const toX = (i: number) => PAD_L + (i / (data.length - 1)) * cW
    const toY = (w: number) => PAD_T + cH - ((w - minW) / (maxW - minW)) * cH

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + (cH * i / 4)
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + cW, y); ctx.stroke()
      const val = maxW - (maxW - minW) * i / 4
      ctx.fillStyle = '#546E7A'; ctx.font = '9px Inter,sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(0), PAD_L - 3, y + 3)
    }
    ctx.fillStyle = '#546E7A'; ctx.font = '9px Inter,sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(data[0].date, PAD_L, H - 4)
    ctx.fillText(data[data.length - 1].date, PAD_L + cW, H - 4)

    const coords = data.map((d, i) => [toX(i), toY(d.weight)] as [number, number])
    const bottom = PAD_T + cH
    const grad = ctx.createLinearGradient(0, PAD_T, 0, bottom)
    grad.addColorStop(0, 'rgba(205,250,65,0.35)')
    grad.addColorStop(1, 'rgba(205,250,65,0.02)')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.moveTo(coords[0][0], bottom); ctx.lineTo(coords[0][0], coords[0][1])
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)], p1 = coords[i], p2 = coords[i + 1]
      const p3 = coords[Math.min(coords.length - 1, i + 2)], t = 0.3
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t,
        p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1])
    }
    ctx.lineTo(coords[coords.length - 1][0], bottom); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(coords[0][0], coords[0][1])
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)], p1 = coords[i], p2 = coords[i + 1]
      const p3 = coords[Math.min(coords.length - 1, i + 2)], t = 0.3
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t,
        p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1])
    }
    ctx.strokeStyle = C; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke()
  }, [data])

  if (data.length < 2) return null
  return <canvas ref={canvasRef} className="w-full" style={{ height: 120, display: 'block' }} />
}

// ── Before/After comparison slider ───────────────────────────────────────────
function CompareSlider({
  photoA, photoB, labelA, labelB, onClose,
}: {
  photoA: string; photoB: string; labelA: string; labelB: string; onClose: () => void
}) {
  const [split, setSplit] = useState(0.5)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const toFraction = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 0.5
    return Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width))
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col" style={{ touchAction: 'none' }}>
      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-col-resize select-none"
        onMouseDown={e => { dragging.current = true; setSplit(toFraction(e.clientX)) }}
        onMouseMove={e => { if (dragging.current) setSplit(toFraction(e.clientX)) }}
        onMouseUp={() => { dragging.current = false }}
        onMouseLeave={() => { dragging.current = false }}
        onTouchStart={e => { dragging.current = true; setSplit(toFraction(e.touches[0].clientX)) }}
        onTouchMove={e => { if (dragging.current) setSplit(toFraction(e.touches[0].clientX)) }}
        onTouchEnd={() => { dragging.current = false }}
      >
        {/* After photo (right) — full width */}
        <img src={photoB} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        {/* Before photo (left) — clipped */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${split * 100}%` }}>
          <img src={photoA} className="absolute inset-0 h-full object-cover" style={{ width: `${100 / split}%`, maxWidth: 'none' }} draggable={false} />
        </div>
        {/* Divider */}
        <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${split * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="w-0.5 flex-1 bg-white" />
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: C, boxShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/><polyline points="9 18 3 12 9 6"/></svg>
          </div>
          <div className="w-0.5 flex-1 bg-white" />
        </div>
        {/* Labels */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold text-white"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          BEFORE<br /><span className="font-normal opacity-80">{labelA}</span>
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold text-white text-right"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          AFTER<br /><span className="font-normal opacity-80">{labelB}</span>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.8)' }}>
        <p className="text-white/60 text-xs">← Drag to compare →</p>
        <button onClick={onClose} className="text-white font-semibold px-4 py-1.5 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)' }}>Close</button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BodyComp() {
  const { bodyComps, user } = useStore()
  const [tab, setTab] = useState(0)

  // Measurements tab state
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [editComp, setEditComp] = useState<any | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteComp, setDeleteComp] = useState<any | null>(null)

  // Photos tab state
  const [photos, setPhotos] = useState<any[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [fullscreenPhoto, setFullscreenPhoto] = useState<any | null>(null)
  const [deletePhoto, setDeletePhoto] = useState<any | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelected, setCompareSelected] = useState<any[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [photoDate, setPhotoDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [photoPose, setPhotoPose] = useState('Front')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load progress photos
  useEffect(() => {
    if (!user) return
    getDocs(query(collection(db, 'users', user.uid, 'progress_photos'), orderBy('date', 'desc')))
      .then(snap => {
        setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setPhotosLoading(false)
      })
      .catch(() => setPhotosLoading(false))
  }, [user])

  const weightData = [...bodyComps].slice(0, 30).reverse()
    .filter(b => b.date != null)
    .map(b => ({ date: format(new Date(toMs(b.date)), 'MMM d'), weight: b.weightLbs }))

  const latest = bodyComps[0]

  // ── Save measurement ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !weight) return
    setSaving(true)
    try {
      const m: Record<string, number> = {}
      MEASUREMENTS.forEach(({ key }) => {
        const v = parseFloat(measurements[key] || '')
        if (!isNaN(v)) m[key] = v
      })
      await addDoc(collection(db, 'users', user.uid, 'body_compositions'), {
        date: new Date(date + 'T12:00:00').getTime(),
        weightLbs: parseFloat(weight),
        bodyFatPercent: bodyFat ? parseFloat(bodyFat) : null,
        notes: notes || null,
        userId: user.uid,
        createdAt: Date.now(),
        ...m,
      })
      setShowAdd(false)
      setWeight(''); setBodyFat(''); setNotes(''); setMeasurements({})
      setDate(format(new Date(), 'yyyy-MM-dd'))
    } finally {
      setSaving(false)
    }
  }

  // ── Edit measurement ──────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!user || !editComp) return
    setEditSaving(true)
    try {
      const m: Record<string, number | null> = {}
      MEASUREMENTS.forEach(({ key }) => {
        const v = parseFloat(editComp[key + '_edit'] || '')
        m[key] = isNaN(v) ? null : v
      })
      await updateDoc(doc(db, 'users', user.uid, 'body_compositions', editComp.id), {
        weightLbs: parseFloat(editComp.weight_edit) || editComp.weightLbs,
        bodyFatPercent: parseFloat(editComp.bf_edit) || null,
        notes: editComp.notes_edit || null,
        ...m,
      })
      setEditComp(null)
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete measurement ────────────────────────────────────────────────────
  const handleDeleteComp = async () => {
    if (!user || !deleteComp) return
    await deleteDoc(doc(db, 'users', user.uid, 'body_compositions', deleteComp.id))
    setDeleteComp(null)
  }

  // ── Compress image to base64 (stays within Firestore 1MB doc limit) ─────────
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        // Max dimension 1080px — keeps base64 well under 700 KB
        const MAX = 1080
        let { width, height } = img
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(objectUrl)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read image')) }
      img.src = objectUrl
    })

  // ── Upload photo (stored as base64 in database — no file storage needed) ──
  const handlePhotoUpload = async (file: File) => {
    if (!user) return
    setUploadingPhoto(true)
    setPhotoError('')
    try {
      const base64 = await toBase64(file)

      // Firestore documents max 1 MB — warn if somehow still too large
      if (base64.length > 900_000) {
        setPhotoError('Image is too large even after compression. Try a smaller photo.')
        return
      }

      const photoDoc = await addDoc(collection(db, 'users', user.uid, 'progress_photos'), {
        base64,
        pose: photoPose,
        date: new Date(photoDate + 'T12:00:00').getTime(),
        userId: user.uid,
        createdAt: Date.now(),
      })
      setPhotos(prev => [{
        id: photoDoc.id, base64, pose: photoPose,
        date: new Date(photoDate + 'T12:00:00').getTime(),
      }, ...prev])
    } catch (err: any) {
      console.error('Photo save failed:', err)
      setPhotoError(err?.message || 'Failed to save photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeletePhoto = async () => {
    if (!user || !deletePhoto) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'progress_photos', deletePhoto.id))
      setPhotos(prev => prev.filter(p => p.id !== deletePhoto.id))
      if (fullscreenPhoto?.id === deletePhoto.id) setFullscreenPhoto(null)
    } catch { }
    setDeletePhoto(null)
  }

  const toggleCompareSelect = (photo: any) => {
    setCompareSelected(prev => {
      if (prev.find(p => p.id === photo.id)) return prev.filter(p => p.id !== photo.id)
      if (prev.length >= 2) return prev
      return [...prev, photo]
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Body Composition</h1>
        <button
          onClick={() => tab === 0 ? setShowAdd(true) : fileInputRef.current?.click()}
          className="text-dark-bg text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: C }}>
          {tab === 0 ? '+ Log' : '+ Photo'}
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }} />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {['Measurements', 'Progress Photos'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === i
              ? { background: 'linear-gradient(135deg,rgba(205,250,65,0.18),rgba(205,250,65,0.08))', color: C, border: '1px solid rgba(205,250,65,0.2)' }
              : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── MEASUREMENTS TAB ── */}
      {tab === 0 && (
        <>
          {/* Stats header */}
          {latest && (
            <div className="grid grid-cols-2 gap-3">
              <div className="glossy-card text-center">
                <p className="text-text-tertiary text-xs mb-1">Current Weight</p>
                <p className="text-3xl font-bold" style={{ color: C }}>{latest.weightLbs.toFixed(1)}</p>
                <p className="text-text-tertiary text-xs">lbs</p>
              </div>
              <div className="glossy-card text-center">
                <p className="text-text-tertiary text-xs mb-1">Body Fat</p>
                <p className="text-3xl font-bold text-white">
                  {latest.bodyFatPercent ? `${latest.bodyFatPercent.toFixed(1)}` : '—'}
                </p>
                <p className="text-text-tertiary text-xs">{latest.bodyFatPercent ? '%' : 'not logged'}</p>
              </div>
            </div>
          )}

          {/* Weight chart */}
          {weightData.length > 1 && (
            <div className="glossy-card">
              <p className="text-text-primary font-semibold text-sm mb-3">Weight Trend</p>
              <WeightChart data={weightData} />
            </div>
          )}

          {/* History */}
          <p className="text-text-tertiary text-xs font-medium px-1 tracking-widest">HISTORY</p>
          {bodyComps.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-secondary">No entries yet</p>
              <p className="text-text-tertiary text-sm mt-1">Log your first measurement</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bodyComps.slice(0, 30).map(b => (
                <div key={b.id} className="glossy-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-text-primary font-bold text-base">{b.weightLbs.toFixed(1)} lbs</p>
                      {b.bodyFatPercent && (
                        <p className="text-xs mt-0.5" style={{ color: C }}>{b.bodyFatPercent.toFixed(1)}% body fat</p>
                      )}
                      {b.date != null && (
                        <p className="text-text-tertiary text-xs mt-0.5">
                          {format(new Date(toMs(b.date)), 'MMMM d, yyyy')}
                        </p>
                      )}
                      {b.notes && <p className="text-text-secondary text-xs mt-1">{b.notes}</p>}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => setEditComp({
                          ...b,
                          weight_edit: String(b.weightLbs),
                          bf_edit: b.bodyFatPercent ? String(b.bodyFatPercent) : '',
                          notes_edit: b.notes || '',
                          ...Object.fromEntries(MEASUREMENTS.map(m => [`${m.key}_edit`, (b as any)[m.key] ? String((b as any)[m.key]) : ''])),
                        })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg"
                        style={{ background: 'rgba(205,250,65,0.1)', color: C }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteComp(b)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg"
                        style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {MEASUREMENTS.some(({ key }) => (b as any)[key]) && (
                    <div className="mt-2 pt-2 border-t border-dark-border flex flex-wrap gap-1.5">
                      {MEASUREMENTS.filter(({ key }) => (b as any)[key]).map(({ key, label }) => (
                        <span key={key} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                          {label}: {(b as any)[key]}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PHOTOS TAB ── */}
      {tab === 1 && (
        <>
          {/* Privacy / security note */}
          <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p className="text-text-tertiary text-xs leading-relaxed">
              Progress photos are compressed and stored directly in your private account database,
              accessible only to you. All data is encrypted in transit and at rest using
              industry-standard security. Your photos are never shared, sold, or accessed by anyone else.
            </p>
          </div>

          {/* Photo date/pose picker before upload */}
          <div className="glossy-card space-y-3">
            <p className="text-text-secondary text-xs font-semibold tracking-widest">PHOTO SETTINGS</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-tertiary mb-1">Date</label>
                <input type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2 text-text-primary text-sm outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-tertiary mb-1">Pose</label>
                <select value={photoPose} onChange={e => setPhotoPose(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2 text-text-primary text-sm outline-none">
                  {POSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => { setPhotoError(''); fileInputRef.current?.click() }}
              disabled={uploadingPhoto}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'rgba(205,250,65,0.1)', border: '1px dashed rgba(205,250,65,0.3)', color: C }}>
              {uploadingPhoto ? (
                <><div className="w-4 h-4 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: C }} /> Uploading...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg> Add Progress Photo</>
              )}
            </button>
            {photoError && (
              <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
                style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: '#FF5252' }}>
                {photoError}
              </div>
            )}
          </div>

          {/* Compare toolbar */}
          {photos.length >= 2 && (
            <div className="flex items-center justify-between">
              {compareMode ? (
                <>
                  <p className="text-xs" style={{ color: C }}>
                    {compareSelected.length === 0 ? 'Select first photo' : compareSelected.length === 1 ? 'Select second photo' : 'Ready to compare'}
                  </p>
                  <div className="flex gap-2">
                    {compareSelected.length === 2 && (
                      <button onClick={() => setShowCompare(true)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: C, color: '#0A0E14' }}>Compare</button>
                    )}
                    <button onClick={() => { setCompareMode(false); setCompareSelected([]) }}
                      className="text-xs text-text-secondary px-3 py-1.5 rounded-lg border border-dark-border">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span />
                  <button onClick={() => setCompareMode(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    style={{ border: `1px solid ${C}`, color: C, background: 'rgba(205,250,65,0.08)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="3" x2="12" y2="21"/><path d="M3 8l9-5 9 5M3 16l9 5 9-5"/>
                    </svg>
                    Before/After
                  </button>
                </>
              )}
            </div>
          )}

          {/* Photos grid */}
          {photosLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: C }} />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-16">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" className="mx-auto mb-3">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="text-text-secondary">No progress photos yet</p>
              <p className="text-text-tertiary text-sm mt-1">Add photos to track your visual progress</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {photos.map(photo => {
                const isSelected = compareSelected.some(p => p.id === photo.id)
                const selectIdx = compareSelected.findIndex(p => p.id === photo.id)
                return (
                  <div key={photo.id}
                    className="relative rounded-xl overflow-hidden cursor-pointer"
                    style={{
                      aspectRatio: '3/4',
                      border: isSelected ? `2px solid ${C}` : '2px solid transparent',
                      boxShadow: isSelected ? `0 0 12px rgba(205,250,65,0.3)` : 'none',
                    }}
                    onClick={() => compareMode ? toggleCompareSelect(photo) : setFullscreenPhoto(photo)}>
                    <img src={photo.base64 || photo.url} className="w-full h-full object-cover" />
                    {/* Compare badge */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                        style={{ background: C }}>{selectIdx + 1}</div>
                    )}
                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
                      <p className="text-white text-xs font-medium">{photo.pose}</p>
                      <p className="text-white/60 text-xs">{format(new Date(photo.date), 'MMM d, yyyy')}</p>
                    </div>
                    {/* Delete button (non-compare mode) */}
                    {!compareMode && (
                      <button
                        onClick={e => { e.stopPropagation(); setDeletePhoto(photo) }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,59,48,0.7)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── FULLSCREEN PHOTO VIEWER ── */}
      {fullscreenPhoto && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col" onClick={() => setFullscreenPhoto(null)}>
          <img src={fullscreenPhoto.base64 || fullscreenPhoto.url} className="flex-1 object-contain w-full" onClick={e => e.stopPropagation()} />
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
            <button
              onClick={e => { e.stopPropagation(); setDeletePhoto(fullscreenPhoto); setFullscreenPhoto(null) }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,59,48,0.7)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
            <button onClick={() => setFullscreenPhoto(null)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <p className="text-white font-semibold">{fullscreenPhoto.pose}</p>
            <p className="text-white/60 text-sm">{format(new Date(fullscreenPhoto.date), 'MMMM d, yyyy')}</p>
          </div>
        </div>
      )}

      {/* ── BEFORE/AFTER SLIDER ── */}
      {showCompare && compareSelected.length === 2 && (
        <CompareSlider
          photoA={compareSelected[0].base64 || compareSelected[0].url}
          photoB={compareSelected[1].base64 || compareSelected[1].url}
          labelA={format(new Date(compareSelected[0].date), 'MMM d, yyyy')}
          labelB={format(new Date(compareSelected[1].date), 'MMM d, yyyy')}
          onClose={() => { setShowCompare(false); setCompareMode(false); setCompareSelected([]) }}
        />
      )}

      {/* ── ADD MEASUREMENT MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50"
          onClick={() => setShowAdd(false)}>
          <div className="w-full md:max-w-lg md:mx-auto md:p-4" onClick={e => e.stopPropagation()}>
            <div className="glossy-card space-y-4 max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-semibold text-base">Log Measurement</p>
                <button onClick={() => setShowAdd(false)} className="text-text-tertiary text-xl">✕</button>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1.5 font-semibold">WEIGHT (lbs) *</label>
                  <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                    placeholder="185.0" className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1.5 font-semibold">BODY FAT %</label>
                  <input type="number" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
                    placeholder="15.0" className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-semibold">DATE</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary" />
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-2 font-semibold">MEASUREMENTS (inches, optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  {MEASUREMENTS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-text-tertiary mb-1">{label} (in)</label>
                      <input type="number" step="0.1" value={measurements[key] || ''}
                        onChange={e => setMeasurements(m => ({ ...m, [key]: e.target.value }))}
                        placeholder="0.0" className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-cyan-primary" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-semibold">NOTES</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Optional notes..." className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 border border-dark-border text-text-secondary py-3 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving || !weight}
                  className="flex-1 font-bold py-3 rounded-xl text-sm disabled:opacity-40"
                  style={{ background: C, color: '#0A0E14' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MEASUREMENT MODAL ── */}
      {editComp && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50"
          onClick={() => setEditComp(null)}>
          <div className="w-full md:max-w-lg md:mx-auto md:p-4" onClick={e => e.stopPropagation()}>
            <div className="glossy-card space-y-4 max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-semibold text-base">Edit Measurement</p>
                <button onClick={() => setEditComp(null)} className="text-text-tertiary text-xl">✕</button>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1.5 font-semibold">WEIGHT (lbs)</label>
                  <input type="number" value={editComp.weight_edit}
                    onChange={e => setEditComp((c: any) => ({ ...c, weight_edit: e.target.value }))}
                    className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1.5 font-semibold">BODY FAT %</label>
                  <input type="number" value={editComp.bf_edit}
                    onChange={e => setEditComp((c: any) => ({ ...c, bf_edit: e.target.value }))}
                    className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary" />
                </div>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-2 font-semibold">MEASUREMENTS (inches)</p>
                <div className="grid grid-cols-2 gap-2">
                  {MEASUREMENTS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-text-tertiary mb-1">{label} (in)</label>
                      <input type="number" step="0.1" value={editComp[`${key}_edit`] || ''}
                        onChange={e => setEditComp((c: any) => ({ ...c, [`${key}_edit`]: e.target.value }))}
                        placeholder="0.0" className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-cyan-primary" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-semibold">NOTES</label>
                <textarea value={editComp.notes_edit || ''} onChange={e => setEditComp((c: any) => ({ ...c, notes_edit: e.target.value }))} rows={2}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditComp(null)}
                  className="flex-1 border border-dark-border text-text-secondary py-3 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={handleEditSave} disabled={editSaving}
                  className="flex-1 font-bold py-3 rounded-xl text-sm disabled:opacity-40"
                  style={{ background: C, color: '#0A0E14' }}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MEASUREMENT CONFIRM ── */}
      {deleteComp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteComp(null)}>
          <div className="glossy-card max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-text-primary font-semibold">Delete this entry?</p>
            <p className="text-text-tertiary text-sm">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteComp(null)}
                className="flex-1 border border-dark-border text-text-secondary py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleDeleteComp}
                className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#FF3B30' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE PHOTO CONFIRM ── */}
      {deletePhoto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4"
          onClick={() => setDeletePhoto(null)}>
          <div className="glossy-card max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-text-primary font-semibold">Delete this photo?</p>
            <p className="text-text-tertiary text-sm">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePhoto(null)}
                className="flex-1 border border-dark-border text-text-secondary py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleDeletePhoto}
                className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#FF3B30' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
