import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Initialize Firebase Admin once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      // Netlify env var stores the private key with literal \n — convert to real newlines
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

async function setSubscriptionStatus(uid, status, periodEnd) {
  await db.doc(`users/${uid}/profile/data`).set(
    {
      subscriptionStatus: status,
      subscriptionPeriodEnd: periodEnd ?? null,
      updatedAt: Date.now(),
    },
    { merge: true }
  )
}

export const handler = async (event) => {
  const sig = event.headers?.['stripe-signature']
  let stripeEvent

  try {
    // Netlify provides body as a string; we need the raw bytes for sig verification
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object
        const uid = session.metadata?.uid
        if (uid) {
          await setSubscriptionStatus(uid, 'active', null)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = stripeEvent.data.object
        const uid = invoice.subscription_details?.metadata?.uid
          || invoice.metadata?.uid
        const sub = await stripe.subscriptions.retrieve(invoice.subscription)
        const uid2 = uid || sub.metadata?.uid
        if (uid2) {
          await setSubscriptionStatus(uid2, 'active', sub.current_period_end * 1000)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object
        const uid = sub.metadata?.uid
        if (uid) {
          const status = sub.status === 'active' ? 'active' : 'expired'
          await setSubscriptionStatus(uid, status, sub.current_period_end * 1000)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object
        const uid = sub.metadata?.uid
        if (uid) {
          await setSubscriptionStatus(uid, 'expired', null)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return { statusCode: 500, body: `Handler error: ${err.message}` }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
