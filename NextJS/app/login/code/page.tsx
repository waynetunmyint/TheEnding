'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { TopBar } from '@/components/shell'
import { Icon } from '@/components/ui'
import { ApiError, errorMessage } from '@/lib/api'
import { CHALLENGE_KEY } from '@/lib/constants'
import { startEmail, verifyEmail } from '@/lib/store'

type Challenge = { challengeId: string; email: string; demoCode: string; sentAt: number }

const noop = () => () => {}
function useChallenge(): Challenge | null {
  const raw = useSyncExternalStore(noop, () => sessionStorage.getItem(CHALLENGE_KEY), () => null)
  try {
    return raw ? (JSON.parse(raw) as Challenge) : null
  } catch {
    return null
  }
}

function CodeForm() {
  const router = useRouter()
  const params = useSearchParams()
  const stored = useChallenge()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const ch = challenge ?? stored
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const wait = ch ? Math.max(0, 45 - Math.floor((now - ch.sentAt) / 1000)) : 0

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(t)
  }, [wait, now])

  if (!ch) {
    return (
      <div className="empty">
        <h2>Start with your email</h2>
        <p>Enter your email address to get a sign-in code.</p>
        <Link href="/login/email/" className="btn btn-primary" style={{ marginTop: 8 }}>Enter email</Link>
      </div>
    )
  }

  const code = digits.join('')
  const verify = async () => {
    if (code.length !== 6 || busy || locked) return
    setBusy(true)
    try {
      const me = await verifyEmail(ch.challengeId, code)
      sessionStorage.removeItem(CHALLENGE_KEY)
      const next = params.get('next')
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : me.onboarded ? '/' : '/welcome/')
    } catch (e) {
      setError(errorMessage(e))
      if (e instanceof ApiError && (e.status === 429 || e.status === 410)) setLocked(true)
      setBusy(false)
    }
  }
  const resend = async () => {
    try {
      const next = await startEmail(ch.email)
      const saved = { ...next, sentAt: Date.now() }
      sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(saved))
      setChallenge(saved)
      setNow(Date.now())
      setLocked(false)
      setError('')
      setDigits(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '')
    if (clean.length > 1) {
      // Pasted code: spread across the boxes.
      const next = clean.slice(0, 6).split('')
      setDigits([...next, ...Array(6 - next.length).fill('')])
      refs.current[Math.min(next.length, 5)]?.focus()
    } else {
      const next = [...digits]
      next[i] = clean
      setDigits(next)
      if (clean && i < 5) refs.current[i + 1]?.focus()
    }
    if (!locked) setError('')
  }

  return (
    <form className="stack" style={{ flex: 1, padding: '8px 20px calc(32px + env(safe-area-inset-bottom))' }} onSubmit={(e) => { e.preventDefault(); void verify() }}>
      <h1 style={{ margin: '12px 0 8px', fontSize: 28, fontWeight: 800 }}>Enter the code</h1>
      <p className="muted" style={{ margin: '0 0 28px', lineHeight: 1.5 }}>Sent to {ch.email} · <Link href="/login/email/">Change</Link></p>
      <div role="group" aria-label="6-digit code" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
        {digits.map((d, i) => (
          <input key={i} ref={(el) => { refs.current[i] = el }} aria-label={`Digit ${i + 1}`} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 6 : 1} value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus() }}
            style={{ height: 58, minWidth: 0, borderRadius: 14, background: 'var(--surface)', border: `1.5px solid ${error ? '#FF5C7A' : '#3A3340'}`, textAlign: 'center', fontSize: 24, fontWeight: 700, outline: 'none' }} />
        ))}
      </div>
      {error && (
        <div role="alert" className="row small" style={{ marginTop: 14, gap: 8, color: 'var(--bad)' }}>
          <Icon name="alert" size={18} />{error}
        </div>
      )}
      <div className="small faint" style={{ marginTop: 20 }}>
        {wait > 0 ? `Resend code in 0:${String(wait).padStart(2, '0')}` : <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', padding: 0 }} onClick={resend}>Resend code</button>}
      </div>
      <p className="tiny faint" style={{ marginTop: 8 }}>Demo: no email was sent. Your code is {ch.demoCode}.</p>
      <div style={{ flex: 1, minHeight: 32 }} />
      <button type="submit" className="btn btn-primary btn-block" disabled={code.length < 6 || busy || locked}>Verify</button>
    </form>
  )
}

export default function CodePage() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: 440, margin: '0 auto' }}>
      <TopBar back="/login/email/" />
      <Suspense><CodeForm /></Suspense>
    </div>
  )
}
