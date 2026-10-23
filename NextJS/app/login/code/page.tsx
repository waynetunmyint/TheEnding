'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { TopBar } from '@/components/shell'
import { Icon } from '@/components/ui'
import { getDemo, update } from '@/lib/demo-store'

const DEMO_CODE = '123456'
const noop = () => () => {}

export default function CodePage() {
  const router = useRouter()
  const email = useSyncExternalStore(noop, () => sessionStorage.getItem('te-login-email') ?? 'you@example.com', () => '')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [tries, setTries] = useState(3)
  const [error, setError] = useState(false)
  const [wait, setWait] = useState(45)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const code = digits.join('')
  const verify = () => {
    if (code === DEMO_CODE) {
      update((s) => ({ ...s, signedIn: true, user: { ...s.user, email, via: 'Email code' } }))
      router.push(getDemo().onboarded ? '/' : '/welcome/')
      return
    }
    setError(true)
    setTries(tries - 1)
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
    setError(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: 440, margin: '0 auto' }}>
      <TopBar back="/login/email/" />
      <form className="stack" style={{ flex: 1, padding: '8px 20px calc(32px + env(safe-area-inset-bottom))' }} onSubmit={(e) => { e.preventDefault(); if (code.length === 6 && tries > 0) verify() }}>
        <h1 style={{ margin: '12px 0 8px', fontSize: 28, fontWeight: 800 }}>Enter the code</h1>
        <p className="muted" style={{ margin: '0 0 28px', lineHeight: 1.5 }}>Sent to {email} · <Link href="/login/email/">Change</Link></p>
        <div role="group" aria-label="6-digit code" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
          {digits.map((d, i) => (
            <input key={i} ref={(el) => { refs.current[i] = el }} aria-label={`Digit ${i + 1}`} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 6 : 1} value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus() }}
              style={{ height: 58, minWidth: 0, borderRadius: 14, background: 'var(--surface)', border: `1.5px solid ${error ? '#FF5C7A' : d ? '#3A3340' : '#3A3340'}`, textAlign: 'center', fontSize: 24, fontWeight: 700, outline: 'none' }} />
          ))}
        </div>
        {error && (
          <div role="alert" className="row small" style={{ marginTop: 14, gap: 8, color: 'var(--bad)' }}>
            <Icon name="alert" size={18} />{tries > 0 ? `That code is incorrect. ${tries} ${tries === 1 ? 'try' : 'tries'} left.` : 'Too many tries. Request a new code.'}
          </div>
        )}
        <div className="small faint" style={{ marginTop: 20 }}>
          {wait > 0 ? `Resend code in 0:${String(wait).padStart(2, '0')}` : <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', padding: 0 }} onClick={() => { setWait(45); setTries(3); setError(false); setDigits(['', '', '', '', '', '']) }}>Resend code</button>}
        </div>
        <p className="tiny faint" style={{ marginTop: 8 }}>Demo code: {DEMO_CODE}</p>
        <div style={{ flex: 1, minHeight: 32 }} />
        <button type="submit" className="btn btn-primary btn-block" disabled={code.length < 6 || tries <= 0}>Verify</button>
      </form>
    </div>
  )
}
