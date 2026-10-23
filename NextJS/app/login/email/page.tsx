'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TopBar } from '@/components/shell'

export default function EmailLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: 440, margin: '0 auto' }}>
      <TopBar back="/login/" />
      <form className="stack" style={{ flex: 1, padding: '8px 20px calc(32px + env(safe-area-inset-bottom))' }}
        onSubmit={(e) => { e.preventDefault(); if (valid) { sessionStorage.setItem('te-login-email', email.trim()); router.push('/login/code/') } }}>
        <h1 style={{ margin: '12px 0 8px', fontSize: 28, fontWeight: 800 }}>Sign in with email</h1>
        <p className="muted" style={{ margin: '0 0 32px', lineHeight: 1.5 }}>We&apos;ll email you a 6-digit code. No password needed.</p>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ flex: 1, minHeight: 32 }} />
        <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>Send code</button>
        <p className="tiny faint" style={{ margin: '16px 0 0', textAlign: 'center' }}>Demo: no email is sent. The code expires in 10 minutes in the real app.</p>
      </form>
    </div>
  )
}
