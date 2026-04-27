import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const TRIAL_DAYS = 7

export interface SubscriptionState {
  status: 'loading' | 'trialing' | 'active' | 'expired'
  daysLeft: number  // trial days remaining (0 when expired or subscribed)
}

export function useSubscription(uid: string | undefined): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({ status: 'loading', daysLeft: 0 })

  useEffect(() => {
    if (!uid) return

    const unsub = onSnapshot(
      doc(db, 'users', uid, 'profile', 'data'),
      (snap) => {
        const data = snap.data()

        // If Stripe webhook wrote 'active' or 'expired'
        const subStatus: string | undefined = data?.subscriptionStatus

        if (subStatus === 'active') {
          setState({ status: 'active', daysLeft: 0 })
          return
        }

        // Trial calculation
        const trialStart: number = data?.trialStartedAt ?? data?.createdAt ?? Date.now()
        const msElapsed = Date.now() - trialStart
        const daysElapsed = msElapsed / 86_400_000
        const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed))

        if (daysLeft > 0) {
          setState({ status: 'trialing', daysLeft })
        } else if (subStatus === 'expired') {
          setState({ status: 'expired', daysLeft: 0 })
        } else {
          // Trial ended, no subscription
          setState({ status: 'expired', daysLeft: 0 })
        }
      },
      (err) => {
        console.error('useSubscription error:', err)
        // On error, fall back to trialing so user isn't hard-locked
        setState({ status: 'trialing', daysLeft: 7 })
      }
    )

    return unsub
  }, [uid])

  return state
}
