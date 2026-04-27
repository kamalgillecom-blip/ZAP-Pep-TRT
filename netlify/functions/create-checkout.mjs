import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/**
 * Geo-detect currency.
 * Netlify injects the country code in the CF-IPCountry header.
 */
function getCurrency(event) {
  const country = event.headers?.['x-country'] || event.headers?.['cf-ipcountry'] || ''
  return country.toUpperCase() === 'CA' ? 'cad' : 'usd'
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { uid, email, plan } = JSON.parse(event.body || '{}')
    if (!uid || !email || !['monthly', 'yearly'].includes(plan)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing uid, email or plan' }) }
    }

    const currency = getCurrency(event)
    const isCAD = currency === 'cad'

    // Price IDs: set in Netlify env vars
    // STRIPE_PRICE_MONTHLY_CAD, STRIPE_PRICE_YEARLY_CAD
    // STRIPE_PRICE_MONTHLY_USD, STRIPE_PRICE_YEARLY_USD
    const priceId = plan === 'monthly'
      ? (isCAD ? process.env.STRIPE_PRICE_MONTHLY_CAD : process.env.STRIPE_PRICE_MONTHLY_USD)
      : (isCAD ? process.env.STRIPE_PRICE_YEARLY_CAD  : process.env.STRIPE_PRICE_YEARLY_USD)

    if (!priceId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Stripe price not configured' }) }
    }

    const origin = event.headers?.origin || process.env.APP_URL || 'https://zappeptide.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { uid },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      subscription_data: {
        metadata: { uid },
      },
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err) {
    console.error('create-checkout error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
