'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { useToast } from '@/components/shell'
import { Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { signInWithGoogle } from '@/lib/store'

const noop = () => () => {}
// In-app browsers (Facebook, Instagram, LINE, Android WebView) block Google sign-in.
function useEmbedded() {
  return useSyncExternalStore(noop, () => /FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|; wv\)/i.test(navigator.userAgent), () => false)
}

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
      <path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z" fill="#FBBC05" />
      <path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" fill="#EA4335" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const embedded = useEmbedded()
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()
  const google = async () => {
    setBusy(true)
    try {
      const me = await signInWithGoogle()
      router.push(me.onboarded ? '/' : '/welcome/')
    } catch (e) {
      show(errorMessage(e))
      setBusy(false)
    }
  }
  const openInBrowser = () => {
    const url = window.location.href
    // Android: hand off to Chrome. iOS in-app browsers have no handoff API; copy the link instead.
    if (/Android/i.test(navigator.userAgent)) window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
    else navigator.clipboard?.writeText(url).then(() => show('Link copied. Paste it in Safari.'), () => {})
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '16px 24px calc(32px + env(safe-area-inset-bottom))', maxWidth: 440, margin: '0 auto' }}>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Link href="/" className="btn btn-ghost btn-sm">Not now</Link></div>
      <div className="stack gap-16" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <img src="/logo.png" alt="The Ending logo" width={80} height={112} style={{ objectFit: 'contain' }} />
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>The Endıng<span style={{ color: '#FF3D5E' }}>.</span></h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5, maxWidth: 280 }}>Sign in to save your progress, collect coins and continue on any device.</p>
      </div>

      {embedded && (
        <div role="status" className="row" style={{ alignItems: 'flex-start', gap: 12, padding: '16px 0' }}>
          <Icon name="warn" size={22} style={{ color: 'var(--warn)', flex: 'none' }} />
          <div className="stack gap-6">
            <strong>Open in your browser to use Google</strong>
            <span className="small muted" style={{ lineHeight: 1.5 }}>Google sign-in does not work inside this app&apos;s browser. Open the page in Safari or Chrome, or sign in with email.</span>
          </div>
        </div>
      )}

      <div className="stack gap-12">
        {embedded ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={openInBrowser}><Icon name="external" size={20} />Open in browser</button>
            <button type="button" className="btn btn-secondary btn-block" disabled>Google unavailable here</button>
          </>
        ) : (
          <button type="button" className="btn btn-light btn-block" disabled={busy} onClick={google}><GoogleG />Continue with Google</button>
        )}
        <Link href="/login/email/" className="btn btn-secondary btn-block"><Icon name="mail" size={20} />Continue with email</Link>
        <p className="tiny faint" style={{ margin: '8px 0 0', textAlign: 'center', lineHeight: 1.6 }}>
          Demo sign-in: Google is simulated and makes a new account each time. Use email to come back to the same account.<br />
          By continuing you agree to our <Link href="/about/#terms">Terms</Link> and <Link href="/about/#privacy">Privacy Policy</Link>.
        </p>
      </div>
      {toast}
    </div>
  )
}
