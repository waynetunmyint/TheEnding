'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { TopBar } from '@/components/shell'
import { errorMessage } from '@/lib/api'
import { CHALLENGE_KEY } from '@/lib/constants'
import { startEmail } from '@/lib/store'

function EmailForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const next = params.get('next') ?? ''
  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      const ch = await startEmail(email.trim())
      sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify({ ...ch, sentAt: Date.now() }))
      router.push(`/login/code/${next ? `?next=${encodeURIComponent(next)}` : ''}`)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <form className="stack" style={{ flex: 1, padding: '8px 20px calc(32px + env(safe-area-inset-bottom))' }} onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <h1 style={{ margin: '12px 0 8px', fontSize: 28, fontWeight: 800 }}>Sign in with email</h1>
      <p className="muted" style={{ margin: '0 0 32px', lineHeight: 1.5 }}>We&apos;ll send a 6-digit code. No password needed.</p>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p role="alert" className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      <div style={{ flex: 1, minHeight: 32 }} />
      <button type="submit" className="btn btn-primary btn-block" disabled={!valid || busy}>Send code</button>
      <p className="tiny faint" style={{ margin: '16px 0 0', textAlign: 'center' }}>Demo: no email is sent. The code is shown on the next screen and expires in 10 minutes.</p>
    </form>
  )
}

export default function EmailLoginPage() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: 440, margin: '0 auto' }}>
      <TopBar back="/login/" />
      <Suspense><EmailForm /></Suspense>
    </div>
  )
}
