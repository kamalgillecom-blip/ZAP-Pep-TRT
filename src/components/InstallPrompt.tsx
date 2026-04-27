import { useState, useEffect } from 'react'

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.zap.peptidetracker'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isAndroid() {
  return /android/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return ('standalone' in navigator && (navigator as any).standalone === true)
    || window.matchMedia('(display-mode: standalone)').matches
}

export default function InstallPrompt() {
  const [showIOS, setShowIOS] = useState(false)
  const [showAndroid, setShowAndroid] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isInStandaloneMode()) return
    if (sessionStorage.getItem('install-dismissed')) return

    if (isAndroid()) {
      setShowAndroid(true)
    } else if (isIOS()) {
      setShowIOS(true)
    }
  }, [])

  const dismiss = () => {
    setShowIOS(false)
    setShowAndroid(false)
    setDismissed(true)
    sessionStorage.setItem('install-dismissed', '1')
  }

  if (dismissed || (!showIOS && !showAndroid)) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 9999,
      background: 'linear-gradient(135deg, rgba(28,36,46,0.98) 0%, rgba(10,14,20,0.99) 100%)',
      border: '1px solid rgba(205,250,65,0.3)',
      borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(205,250,65,0.1)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <img src="/logo.png" alt="App icon" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#CDFA41', fontWeight: 700, fontSize: 14, margin: 0 }}>
          Get the App
        </p>

        {showIOS && (
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>
            Tap the <strong style={{ color: 'white' }}>Share</strong> button{' '}
            <span style={{ fontSize: 15 }}>⎋</span> at the bottom of Safari, then{' '}
            <strong style={{ color: 'white' }}>"Add to Home Screen"</strong>.
          </p>
        )}

        {showAndroid && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: '4px 0 8px', lineHeight: 1.5 }}>
              The full Android app is available on Google Play.
            </p>
            <button
              onClick={() => { window.open(PLAY_STORE_URL, '_blank'); dismiss() }}
              style={{
                background: '#CDFA41', color: '#0A0E14', border: 'none',
                borderRadius: 8, padding: '7px 16px', fontWeight: 700,
                fontSize: 13, cursor: 'pointer',
              }}>
              Download on Google Play
            </button>
          </>
        )}
      </div>

      <button onClick={dismiss} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
      }}>✕</button>
    </div>
  )
}
