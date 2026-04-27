import { useState, useEffect } from 'react'
import { collection, addDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { MOCK_VIALS, MOCK_DOSE_LOGS, MOCK_BODY_COMPS, MOCK_EXERCISE_LOGS } from './mockData'

const MOCK_FLAG = 'zap_has_mock_data'

export function useMockData(uid: string | undefined) {
  const [hasMockData, setHasMockData] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Check if this user has mock data
  useEffect(() => {
    if (!uid) return
    const flag = localStorage.getItem(`${MOCK_FLAG}_${uid}`)
    if (flag === 'true') {
      setHasMockData(true)
      return
    }
    // Also check Firestore in case localStorage was cleared
    getDocs(query(collection(db, 'users', uid, 'dose_logs'), where('isMockData', '==', true)))
      .then(snap => {
        if (!snap.empty) {
          setHasMockData(true)
          localStorage.setItem(`${MOCK_FLAG}_${uid}`, 'true')
        }
      })
      .catch(() => {})
  }, [uid])

  const seedMockData = async () => {
    if (!uid || seeding) return
    setSeeding(true)
    try {
      const batch = writeBatch(db)

      // Vials
      for (const v of MOCK_VIALS) {
        const ref = doc(db, 'users', uid, 'vials', v.id)
        batch.set(ref, { ...v, userId: uid })
      }

      await batch.commit()

      // Dose logs (addDoc, so auto-id)
      for (const l of MOCK_DOSE_LOGS) {
        await addDoc(collection(db, 'users', uid, 'dose_logs'), { ...l, userId: uid })
      }

      // Body compositions
      for (const b of MOCK_BODY_COMPS) {
        await addDoc(collection(db, 'users', uid, 'body_compositions'), { ...b, userId: uid })
      }

      // Exercise logs
      for (const e of MOCK_EXERCISE_LOGS) {
        await addDoc(collection(db, 'users', uid, 'exerciseLogs'), { ...e, userId: uid, createdAt: Date.now() })
      }

      localStorage.setItem(`${MOCK_FLAG}_${uid}`, 'true')
      setHasMockData(true)
    } finally {
      setSeeding(false)
    }
  }

  const deleteMockData = async () => {
    if (!uid || deleting) return
    setDeleting(true)
    try {
      const colls = ['vials', 'dose_logs', 'body_compositions', 'exerciseLogs']
      for (const coll of colls) {
        const snap = await getDocs(
          query(collection(db, 'users', uid, coll), where('isMockData', '==', true))
        )
        const batch = writeBatch(db)
        snap.docs.forEach(d => batch.delete(d.ref))
        if (!snap.empty) await batch.commit()
      }
      localStorage.setItem(`${MOCK_FLAG}_${uid}`, 'false')
      setHasMockData(false)
    } finally {
      setDeleting(false)
    }
  }

  return { hasMockData, seeding, deleting, seedMockData, deleteMockData }
}

/** Call this when user saves their first real entry to prompt mock data removal */
export function checkFirstEntry(uid: string): boolean {
  const key = `${MOCK_FLAG}_${uid}`
  return localStorage.getItem(key) === 'true'
}
