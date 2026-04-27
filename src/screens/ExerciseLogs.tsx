import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { collection, addDoc, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'
import { format } from 'date-fns'
import { CYAN_PRIMARY } from '../lib/theme'

const C = '#CDFA41'
const ITEM_H = 50

const CATEGORIES = ['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'OTHER'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_COLORS: Record<Category, string> = {
  STRENGTH: '#FF6D00',
  CARDIO: '#00E676',
  FLEXIBILITY: '#448AFF',
  OTHER: '#9E9E9E',
}

interface Exercise { name: string; muscleGroup: string }

const EXERCISES: Record<Category, Exercise[]> = {
  STRENGTH: [
    { name: 'Bench Press', muscleGroup: 'Chest' },
    { name: 'Incline Bench Press', muscleGroup: 'Chest' },
    { name: 'Decline Bench Press', muscleGroup: 'Chest' },
    { name: 'Dumbbell Bench Press', muscleGroup: 'Chest' },
    { name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
    { name: 'Cable Flyes', muscleGroup: 'Chest' },
    { name: 'Dumbbell Flyes', muscleGroup: 'Chest' },
    { name: 'Push Ups', muscleGroup: 'Chest' },
    { name: 'Chest Dips', muscleGroup: 'Chest' },
    { name: 'Machine Chest Press', muscleGroup: 'Chest' },
    { name: 'Pec Deck', muscleGroup: 'Chest' },
    { name: 'Deadlift', muscleGroup: 'Back' },
    { name: 'Barbell Row', muscleGroup: 'Back' },
    { name: 'Dumbbell Row', muscleGroup: 'Back' },
    { name: 'Pull Ups', muscleGroup: 'Back' },
    { name: 'Chin Ups', muscleGroup: 'Back' },
    { name: 'Lat Pulldown', muscleGroup: 'Back' },
    { name: 'Seated Cable Row', muscleGroup: 'Back' },
    { name: 'T-Bar Row', muscleGroup: 'Back' },
    { name: 'Face Pulls', muscleGroup: 'Back' },
    { name: 'Hyperextensions', muscleGroup: 'Back' },
    { name: 'Overhead Press', muscleGroup: 'Shoulders' },
    { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders' },
    { name: 'Lateral Raises', muscleGroup: 'Shoulders' },
    { name: 'Front Raises', muscleGroup: 'Shoulders' },
    { name: 'Rear Delt Flyes', muscleGroup: 'Shoulders' },
    { name: 'Arnold Press', muscleGroup: 'Shoulders' },
    { name: 'Upright Rows', muscleGroup: 'Shoulders' },
    { name: 'Shrugs', muscleGroup: 'Shoulders' },
    { name: 'Barbell Curl', muscleGroup: 'Arms' },
    { name: 'Dumbbell Curl', muscleGroup: 'Arms' },
    { name: 'Hammer Curl', muscleGroup: 'Arms' },
    { name: 'Preacher Curl', muscleGroup: 'Arms' },
    { name: 'Tricep Pushdown', muscleGroup: 'Arms' },
    { name: 'Skull Crushers', muscleGroup: 'Arms' },
    { name: 'Overhead Tricep Extension', muscleGroup: 'Arms' },
    { name: 'Close Grip Bench Press', muscleGroup: 'Arms' },
    { name: 'Cable Curl', muscleGroup: 'Arms' },
    { name: 'Tricep Dips', muscleGroup: 'Arms' },
    { name: 'Squat', muscleGroup: 'Legs' },
    { name: 'Front Squat', muscleGroup: 'Legs' },
    { name: 'Leg Press', muscleGroup: 'Legs' },
    { name: 'Romanian Deadlift', muscleGroup: 'Legs' },
    { name: 'Leg Curl', muscleGroup: 'Legs' },
    { name: 'Leg Extension', muscleGroup: 'Legs' },
    { name: 'Bulgarian Split Squat', muscleGroup: 'Legs' },
    { name: 'Lunges', muscleGroup: 'Legs' },
    { name: 'Hip Thrust', muscleGroup: 'Legs' },
    { name: 'Calf Raises', muscleGroup: 'Legs' },
    { name: 'Hack Squat', muscleGroup: 'Legs' },
    { name: 'Goblet Squat', muscleGroup: 'Legs' },
    { name: 'Plank', muscleGroup: 'Core' },
    { name: 'Cable Crunch', muscleGroup: 'Core' },
    { name: 'Hanging Leg Raise', muscleGroup: 'Core' },
    { name: 'Ab Wheel Rollout', muscleGroup: 'Core' },
    { name: 'Russian Twist', muscleGroup: 'Core' },
    { name: 'Sit Ups', muscleGroup: 'Core' },
    { name: 'Crunches', muscleGroup: 'Core' },
  ],
  CARDIO: [
    { name: 'Running', muscleGroup: 'Cardio' },
    { name: 'Treadmill', muscleGroup: 'Cardio' },
    { name: 'Cycling', muscleGroup: 'Cardio' },
    { name: 'Stationary Bike', muscleGroup: 'Cardio' },
    { name: 'Elliptical', muscleGroup: 'Cardio' },
    { name: 'Rowing Machine', muscleGroup: 'Cardio' },
    { name: 'Stair Climber', muscleGroup: 'Cardio' },
    { name: 'Jump Rope', muscleGroup: 'Cardio' },
    { name: 'Swimming', muscleGroup: 'Cardio' },
    { name: 'Walking', muscleGroup: 'Cardio' },
    { name: 'Hiking', muscleGroup: 'Cardio' },
    { name: 'Sprints', muscleGroup: 'Cardio' },
    { name: 'Battle Ropes', muscleGroup: 'Cardio' },
    { name: 'Box Jumps', muscleGroup: 'Cardio' },
    { name: 'Burpees', muscleGroup: 'Cardio' },
  ],
  FLEXIBILITY: [
    { name: 'Yoga', muscleGroup: 'Flexibility' },
    { name: 'Stretching', muscleGroup: 'Flexibility' },
    { name: 'Foam Rolling', muscleGroup: 'Flexibility' },
    { name: 'Pilates', muscleGroup: 'Flexibility' },
    { name: 'Mobility Work', muscleGroup: 'Flexibility' },
    { name: 'Dynamic Stretching', muscleGroup: 'Flexibility' },
    { name: 'Static Stretching', muscleGroup: 'Flexibility' },
  ],
  OTHER: [
    { name: 'HIIT', muscleGroup: 'Mixed' },
    { name: 'CrossFit WOD', muscleGroup: 'Mixed' },
    { name: 'Circuit Training', muscleGroup: 'Mixed' },
    { name: 'Functional Training', muscleGroup: 'Mixed' },
    { name: 'Calisthenics', muscleGroup: 'Mixed' },
    { name: 'Kickboxing', muscleGroup: 'Mixed' },
    { name: 'Martial Arts', muscleGroup: 'Mixed' },
    { name: 'Sports Practice', muscleGroup: 'Mixed' },
    { name: 'Rock Climbing', muscleGroup: 'Mixed' },
    { name: 'Plyometrics', muscleGroup: 'Mixed' },
  ],
}

interface SetRow { reps: string; weight: string }
interface CustomExercise { name: string; category: Category; muscleGroup: string }

const REPS_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1)
const WEIGHT_OPTIONS = Array.from({ length: 201 }, (_, i) => Math.round(i * 2.5 * 10) / 10)

const nearestWeight = (w: number) => {
  const idx = Math.round(w / 2.5)
  return WEIGHT_OPTIONS[Math.max(0, Math.min(idx, WEIGHT_OPTIONS.length - 1))]
}

const toMs = (val: any): number => {
  if (typeof val === 'number') return val
  if (val?.toMillis) return val.toMillis()
  if (val?.seconds) return val.seconds * 1000
  return new Date(val).getTime()
}

// ── Wheel Picker ─────────────────────────────────────────────────────────────
function WheelPicker({
  options,
  initialValue,
  onChange,
  label,
  formatFn,
}: {
  options: number[]
  initialValue: number
  onChange: (v: number) => void
  label: string
  formatFn?: (v: number) => string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const readIdx = (el: HTMLDivElement) =>
    Math.max(0, Math.min(Math.round(el.scrollTop / ITEM_H), options.length - 1))

  const highlight = (idx: number) => {
    itemsRef.current.forEach((el, i) => {
      if (!el) return
      el.style.color = i === idx ? C : 'rgba(255,255,255,0.25)'
      el.style.fontSize = i === idx ? '24px' : '20px'
    })
  }

  useLayoutEffect(() => {
    const idx = Math.max(0, options.indexOf(initialValue))
    if (containerRef.current) containerRef.current.scrollTop = idx * ITEM_H
    highlight(idx)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const done = () => {
      clearTimeout(timeoutRef.current)
      const idx = readIdx(el)
      highlight(idx)
      onChange(options[idx])
    }
    const onScroll = () => {
      highlight(readIdx(el))
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(done, 160)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    ;(el as any).addEventListener('scrollend', done)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ;(el as any).removeEventListener('scrollend', done)
      clearTimeout(timeoutRef.current)
    }
  }, [options, onChange])

  return (
    <div style={{ flex: 1, position: 'relative', userSelect: 'none' }}>
      <p style={{
        textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11,
        fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase',
      }}>{label}</p>
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 24, left: 0, right: 0, height: ITEM_H * 2,
        background: 'linear-gradient(to bottom, rgba(7,10,15,0.98) 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2,
        background: 'linear-gradient(to top, rgba(7,10,15,0.98) 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Selection ring */}
      <div style={{
        position: 'absolute', top: 24 + ITEM_H * 2, left: 8, right: 8, height: ITEM_H,
        background: 'rgba(205,250,65,0.07)',
        border: '1px solid rgba(205,250,65,0.28)',
        borderRadius: 12, pointerEvents: 'none', zIndex: 1,
      }} />
      <div
        ref={containerRef}
        style={{
          height: ITEM_H * 5,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {options.map((opt, i) => (
          <div
            key={i}
            ref={el => { itemsRef.current[i] = el }}
            onClick={() => containerRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })}
            style={{
              height: ITEM_H,
              scrollSnapAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 600,
              color: opt === initialValue ? C : 'rgba(255,255,255,0.25)',
              cursor: 'pointer', transition: 'color 0.08s',
            }}
          >
            {formatFn ? formatFn(opt) : opt}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  )
}

// ── Set Picker Sheet ──────────────────────────────────────────────────────────
function SetPickerSheet({
  setIndex,
  initialReps,
  initialWeight,
  onConfirm,
  onClose,
}: {
  setIndex: number
  initialReps: number
  initialWeight: number
  onConfirm: (reps: number, weight: number) => void
  onClose: () => void
}) {
  const [reps, setReps] = useState(initialReps)
  const [weight, setWeight] = useState(initialWeight)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, #0e1218 0%, #070a0f 100%)',
        borderRadius: '22px 22px 0 0',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '14px auto 0' }} />
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 4px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 500 }}>Set {setIndex + 1}</p>
          <button
            onClick={() => onConfirm(reps, weight)}
            style={{ color: C, fontSize: 17, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            Done
          </button>
        </div>
        {/* Wheels */}
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 12px 8px', gap: 4 }}>
          <WheelPicker
            key={`reps-${setIndex}-${initialReps}`}
            options={REPS_OPTIONS}
            initialValue={initialReps}
            onChange={setReps}
            label="Reps"
          />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', margin: '28px 4px 0', alignSelf: 'stretch' }} />
          <WheelPicker
            key={`weight-${setIndex}-${initialWeight}`}
            options={WEIGHT_OPTIONS}
            initialValue={initialWeight}
            onChange={setWeight}
            label="Weight (lbs)"
            formatFn={v => v === 0 ? 'BW' : v % 1 === 0 ? String(v) : v.toFixed(1)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExerciseLogs() {
  const { exerciseLogs, user } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([])
  const [editingSetIdx, setEditingSetIdx] = useState<number | null>(null)
  const [pickerReps, setPickerReps] = useState(10)
  const [pickerWeight, setPickerWeight] = useState(100)

  // Custom exercise creation form inside the picker
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState('')

  useEffect(() => {
    if (!user) return
    getDocs(collection(db, 'users', user.uid, 'custom_exercises')).then(snap => {
      setCustomExercises(snap.docs.map(d => d.data() as CustomExercise))
    })
  }, [user])

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('STRENGTH')
  const [sets, setSets] = useState<SetRow[]>([{ reps: '10', weight: '100' }])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [search, setSearch] = useState('')

  const addSet = () => setSets(prev => [...prev, { reps: '10', weight: prev[prev.length - 1]?.weight || '100' }])
  const removeSet = (i: number) => setSets(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
  const updateSet = (i: number, field: 'reps' | 'weight', val: string) =>
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))

  const resetForm = () => {
    setName(''); setCategory('STRENGTH')
    setSets([{ reps: '10', weight: '100' }])
    setDuration(''); setNotes(''); setDate(format(new Date(), 'yyyy-MM-dd'))
    setSearch(''); setShowCustomForm(false); setCustomName(''); setCustomMuscle('')
  }

  const allExercises = useMemo<Record<Category, Exercise[]>>(() => {
    const merged: Record<Category, Exercise[]> = {
      STRENGTH: [...EXERCISES.STRENGTH],
      CARDIO: [...EXERCISES.CARDIO],
      FLEXIBILITY: [...EXERCISES.FLEXIBILITY],
      OTHER: [...EXERCISES.OTHER],
    }
    customExercises.forEach(e => {
      const cat = (e.category || 'OTHER') as Category
      if (!merged[cat].find(x => x.name === e.name)) {
        merged[cat].push({ name: e.name, muscleGroup: e.muscleGroup || 'Custom' })
      }
    })
    return merged
  }, [customExercises])

  const filteredExercises = useMemo(() => {
    const list = allExercises[category] || []
    if (!search) return list
    return list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
  }, [allExercises, category, search])

  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {}
    filteredExercises.forEach(e => {
      if (!groups[e.muscleGroup]) groups[e.muscleGroup] = []
      groups[e.muscleGroup].push(e)
    })
    return groups
  }, [filteredExercises])

  const saveCustomExercise = async () => {
    if (!user || !customName.trim()) return
    const ex: CustomExercise = {
      name: customName.trim(),
      category,
      muscleGroup: customMuscle.trim() || 'Custom',
    }
    await setDoc(doc(db, 'users', user.uid, 'custom_exercises', ex.name.replace(/\s+/g, '_')), ex)
    setCustomExercises(prev => [...prev.filter(e => e.name !== ex.name), ex])
    setName(ex.name)
    setShowCustomForm(false)
    setCustomName('')
    setCustomMuscle('')
  }

  const handleSave = async () => {
    if (!user || !name) return
    setSaving(true)
    try {
      const allNames = (Object.values(allExercises) as Exercise[][]).flat().map(e => e.name)
      if (!allNames.includes(name)) {
        const customEx: CustomExercise = { name, category, muscleGroup: 'Custom' }
        await setDoc(doc(db, 'users', user.uid, 'custom_exercises', name.replace(/\s+/g, '_')), customEx)
        setCustomExercises(prev => [...prev.filter(e => e.name !== name), customEx])
      }
      const setsData = category === 'STRENGTH'
        ? sets.filter(s => s.reps || s.weight).map(s => ({
            reps: s.reps ? parseInt(s.reps) : null,
            weight: s.weight ? parseFloat(s.weight) : null,
          }))
        : null
      await addDoc(collection(db, 'users', user.uid, 'exerciseLogs'), {
        exerciseName: name, category, sets: setsData,
        durationMinutes: duration ? parseInt(duration) : null,
        notes: notes || null,
        date: new Date(date + 'T12:00:00').getTime(),
        userId: user.uid, createdAt: Date.now(),
      })
      setShowAdd(false)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const openPicker = (i: number) => {
    const r = parseInt(sets[i].reps) || 10
    const w = nearestWeight(parseFloat(sets[i].weight) || 100)
    setPickerReps(Math.max(1, Math.min(r, 50)))
    setPickerWeight(w)
    setEditingSetIdx(i)
  }

  const grouped = (exerciseLogs as any[]).reduce((acc: Record<string, any[]>, log: any) => {
    const ms = toMs(log.date)
    if (!ms || isNaN(ms)) return acc
    const key = format(new Date(ms), 'yyyy-MM-dd')
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const getSummary = (log: any) => {
    const cat = (log.category || 'OTHER') as Category
    if (Array.isArray(log.sets) && log.sets.length > 0) {
      const totalSets = log.sets.length
      const maxWeight = Math.max(...log.sets.map((s: any) => s.weight || 0))
      return `${totalSets} set${totalSets > 1 ? 's' : ''}${maxWeight ? ` · up to ${maxWeight} lbs` : ''}`
    }
    if (typeof log.sets === 'number') {
      return [
        log.sets ? `${log.sets} sets` : '',
        log.reps ? `${log.reps} reps` : '',
        log.weightLbs ? `${log.weightLbs} lbs` : '',
        log.durationMinutes ? `${log.durationMinutes} min` : '',
      ].filter(Boolean).join(' · ')
    }
    return cat
  }

  return (
    <div className="screen-enter space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Exercise Log</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-dark-bg text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: C }}
        >
          + Log Exercise
        </button>
      </div>

      {exerciseLogs.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No exercises logged</p>
          <p className="text-text-tertiary text-sm mt-1">Track your workouts and PRs</p>
        </div>
      )}

      <div className="space-y-4">
        {sortedDates.map(dateKey => (
          <div key={dateKey}>
            <p className="text-text-tertiary text-xs font-medium mb-2 px-1">
              {format(new Date(dateKey + 'T12:00:00'), 'EEEE, MMMM d')}
            </p>
            <div className="space-y-2">
              {grouped[dateKey].map((log: any) => {
                const isExp = expanded === log.id
                const cat = (log.category || 'OTHER') as Category
                const color = CATEGORY_COLORS[cat] || '#9E9E9E'
                const newFormatSets: any[] = Array.isArray(log.sets) ? log.sets : []
                return (
                  <div key={log.id} className="glossy-card">
                    <button onClick={() => setExpanded(isExp ? null : log.id)} className="w-full text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <div className="flex-1">
                          <p className="text-text-primary text-sm font-medium">{log.exerciseName}</p>
                          <p className="text-text-tertiary text-xs">{getSummary(log)}</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#546E7A" strokeWidth="2"
                          className={`transition-transform flex-shrink-0 ${isExp ? 'rotate-90' : ''}`}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    </button>
                    {isExp && (
                      <div className="mt-3 pt-3 border-t border-dark-border space-y-2">
                        {newFormatSets.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-3 gap-1 mb-1">
                              <p className="text-text-tertiary text-xs font-medium">Set</p>
                              <p className="text-text-tertiary text-xs font-medium">Reps</p>
                              <p className="text-text-tertiary text-xs font-medium">Weight</p>
                            </div>
                            {newFormatSets.map((s: any, i: number) => (
                              <div key={i} className="grid grid-cols-3 gap-1 bg-dark-variant rounded-lg px-2 py-1.5">
                                <p className="text-text-tertiary text-xs">{i + 1}</p>
                                <p className="text-text-primary text-xs font-semibold">{s.reps ?? '—'}</p>
                                <p className="text-xs font-semibold" style={{ color: CYAN_PRIMARY }}>{s.weight ? `${s.weight} lbs` : '—'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {newFormatSets.length === 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {log.sets && typeof log.sets === 'number' && <div className="bg-dark-variant rounded-lg p-2 text-center">
                              <p className="text-text-tertiary text-xs">Sets</p>
                              <p className="text-text-primary font-semibold">{log.sets}</p>
                            </div>}
                            {log.reps && <div className="bg-dark-variant rounded-lg p-2 text-center">
                              <p className="text-text-tertiary text-xs">Reps</p>
                              <p className="text-text-primary font-semibold">{log.reps}</p>
                            </div>}
                            {log.weightLbs && <div className="bg-dark-variant rounded-lg p-2 text-center">
                              <p className="text-text-tertiary text-xs">Weight</p>
                              <p className="text-text-primary font-semibold">{log.weightLbs} lbs</p>
                            </div>}
                            {log.durationMinutes && <div className="bg-dark-variant rounded-lg p-2 text-center">
                              <p className="text-text-tertiary text-xs">Duration</p>
                              <p className="text-text-primary font-semibold">{log.durationMinutes} min</p>
                            </div>}
                          </div>
                        )}
                        {log.notes && <p className="text-text-secondary text-xs">{log.notes}</p>}
                        <button onClick={async () => {
                          if (!user) return
                          await deleteDoc(doc(db, 'users', user.uid, 'exerciseLogs', log.id))
                          setExpanded(null)
                        }} className="text-status-red/60 text-xs">Delete</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Log Exercise Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50"
          onClick={() => { setShowAdd(false); resetForm() }}>
          <div className="w-full md:max-w-lg md:mx-auto md:p-4" onClick={e => e.stopPropagation()}>
            <div className="glossy-card space-y-4 max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
              <div className="flex items-center justify-between sticky top-0 bg-dark-surface/90 backdrop-blur-sm -mx-4 -mt-4 px-4 pt-4 pb-3 rounded-t-3xl md:rounded-t-2xl">
                <p className="text-text-primary font-semibold text-base">Log Exercise</p>
                <button onClick={() => { setShowAdd(false); resetForm() }}
                  className="text-text-tertiary text-xl w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>✕</button>
              </div>

              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setCategory(cat); setSearch(''); setName('') }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: category === cat ? CATEGORY_COLORS[cat] + '22' : 'transparent',
                      border: `1.5px solid ${category === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.1)'}`,
                      color: category === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.45)',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setShowCustomForm(false) }}
                placeholder={`Search ${category.toLowerCase()} exercises...`}
                className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:border-cyan-primary outline-none"
              />

              {/* Exercise list — scrollable, custom button floats below */}
              <div style={{ position: 'relative' }}>
                <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
                  {Object.entries(groupedExercises).map(([group, exercises]) => (
                    <div key={group}>
                      <p className="text-xs font-bold tracking-widest mb-1 px-1 pt-1"
                        style={{ color: CYAN_PRIMARY + '99' }}>{group.toUpperCase()}</p>
                      {exercises.map(ex => (
                        <button key={ex.name} onClick={() => setName(ex.name)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between"
                          style={{
                            background: name === ex.name ? 'rgba(205,250,65,0.1)' : 'transparent',
                            color: name === ex.name ? C : 'rgba(232,234,246,0.85)',
                          }}>
                          {ex.name}
                          {name === ex.name && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                  {filteredExercises.length === 0 && (
                    <p className="text-text-tertiary text-xs px-2 py-2 text-center">No matches found</p>
                  )}
                </div>

                {/* Bottom fade so list fades into the button */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
                  background: 'linear-gradient(transparent, rgba(18,24,32,0.95))',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Add Custom Exercise — always visible, outside scroll */}
              {!showCustomForm ? (
                <button
                  onClick={() => { setShowCustomForm(true); setCustomName(search); setCustomMuscle('') }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(205,250,65,0.07)', border: '1px dashed rgba(205,250,65,0.3)', color: C }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {search ? `Add "${search}" as custom` : 'Add Custom Exercise'}
                </button>
              ) : (
                <div className="space-y-2 p-3 rounded-xl" style={{ background: 'rgba(205,250,65,0.05)', border: '1px solid rgba(205,250,65,0.18)' }}>
                  <p className="text-xs font-semibold" style={{ color: C }}>New Custom Exercise</p>
                  <input
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Exercise name"
                    className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none"
                    autoFocus
                  />
                  <input
                    value={customMuscle}
                    onChange={e => setCustomMuscle(e.target.value)}
                    placeholder="Muscle group (e.g. Chest, Back...)"
                    className="w-full bg-dark-variant border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCustomForm(false)}
                      className="flex-1 py-1.5 rounded-lg text-xs text-text-secondary border border-dark-border">
                      Cancel
                    </button>
                    <button onClick={saveCustomExercise}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: C, color: '#0A0E14' }}>
                      Add to Library
                    </button>
                  </div>
                </div>
              )}

              {/* Selected exercise display */}
              {name && (
                <div className="px-3 py-2 rounded-xl flex items-center gap-2"
                  style={{ background: 'rgba(205,250,65,0.08)', border: '1px solid rgba(205,250,65,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className="text-sm font-semibold" style={{ color: C }}>{name}</p>
                </div>
              )}

              {/* Sets for STRENGTH — tap to open wheel picker */}
              {category === 'STRENGTH' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-secondary font-semibold">SETS</label>
                    <button onClick={addSet}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(205,250,65,0.12)', color: C }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add Set
                    </button>
                  </div>
                  <p className="text-text-tertiary text-xs -mt-1">Tap a set to adjust reps & weight</p>
                  <div className="space-y-2">
                    {sets.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: 'rgba(205,250,65,0.12)', color: C }}>
                          {i + 1}
                        </div>
                        <button
                          onClick={() => openPicker(i)}
                          className="flex-1 flex items-center rounded-xl overflow-hidden"
                          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex-1 py-3 text-center border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                            <p className="text-text-tertiary text-xs mb-0.5">Reps</p>
                            <p className="text-text-primary text-lg font-bold leading-none">
                              {s.reps || '—'}
                            </p>
                          </div>
                          <div className="flex-1 py-3 text-center">
                            <p className="text-text-tertiary text-xs mb-0.5">Weight</p>
                            <p className="text-lg font-bold leading-none" style={{ color: C }}>
                              {s.weight ? `${s.weight}` : '—'}
                              {s.weight && <span className="text-xs font-normal ml-0.5 opacity-70">lbs</span>}
                            </p>
                          </div>
                        </button>
                        {sets.length > 1 && (
                          <button onClick={() => removeSet(i)}
                            className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
                            style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration for non-STRENGTH */}
              {category !== 'STRENGTH' && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5 font-semibold">DURATION (minutes)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="—"
                    className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary" />
                </div>
              )}

              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-semibold">DATE</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary" />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-semibold">NOTES (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did it feel?"
                  rows={2} className="w-full bg-dark-variant border border-dark-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-cyan-primary resize-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowAdd(false); resetForm() }}
                  className="flex-1 border border-dark-border text-text-secondary py-3 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving || !name}
                  className="flex-1 font-bold py-3 rounded-xl text-sm disabled:opacity-40"
                  style={{ background: C, color: '#0A0E14' }}>
                  {saving ? 'Saving...' : 'Save Exercise'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wheel Picker Sheet — renders above modal */}
      {editingSetIdx !== null && (
        <SetPickerSheet
          setIndex={editingSetIdx}
          initialReps={pickerReps}
          initialWeight={pickerWeight}
          onConfirm={(r, w) => {
            updateSet(editingSetIdx, 'reps', String(r))
            updateSet(editingSetIdx, 'weight', String(w === 0 ? 0 : w))
            setEditingSetIdx(null)
          }}
          onClose={() => setEditingSetIdx(null)}
        />
      )}
    </div>
  )
}
