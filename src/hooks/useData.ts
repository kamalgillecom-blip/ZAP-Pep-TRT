import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store/useStore'

export function useData(userId: string | undefined) {
  const {
    setDoseLogs, setVials, setBodyComps, setSchedules,
    setBloodWork, setExerciseLogs, setLoading,
  } = useStore()

  useEffect(() => {
    if (!userId) return

    setLoading(true)
    const unsubs: (() => void)[] = []

    // Android app collection names (exact match to CloudSyncManager.kt)
    unsubs.push(onSnapshot(
      query(collection(db, 'users', userId, 'dose_logs'), orderBy('dateTime', 'desc')),
      (snap) => {
        setDoseLogs(snap.docs.map(d => ({ id: d.id, userId, ...d.data() } as any)))
        setLoading(false)
      },
      () => setLoading(false) // on error still unblock
    ))

    unsubs.push(onSnapshot(
      query(collection(db, 'users', userId, 'vials')),
      (snap) => setVials(snap.docs.map(d => ({ id: d.id, userId, ...d.data() } as any)))
    ))

    unsubs.push(onSnapshot(
      query(collection(db, 'users', userId, 'body_compositions'), orderBy('date', 'desc')),
      (snap) => setBodyComps(snap.docs.map(d => ({ id: d.id, userId, ...d.data() } as any)))
    ))

    unsubs.push(onSnapshot(
      query(collection(db, 'users', userId, 'blood_work'), orderBy('date', 'desc')),
      (snap) => setBloodWork(snap.docs.map(d => ({ id: d.id, userId, ...d.data() } as any)))
    ))

    // Schedules — web-only for now (Android doesn't sync schedules to Firestore)
    unsubs.push(onSnapshot(
      query(collection(db, 'users', userId, 'schedules')),
      (snap) => setSchedules(snap.docs.map(d => ({ id: d.id, userId, ...d.data() } as any)))
    ))

    // Exercise logs — web-only for now
    unsubs.push(onSnapshot(
      query(collection(db, 'users', userId, 'exerciseLogs'), orderBy('date', 'desc')),
      (snap) => setExerciseLogs(snap.docs.map(d => ({ id: d.id, userId, ...d.data() } as any))),
      () => {} // ignore if empty
    ))

    return () => unsubs.forEach(u => u())
  }, [userId])
}
