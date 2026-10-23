'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppShell, RequireSignIn, TopBar } from '@/components/shell'
import { errorMessage } from '@/lib/api'
import { deleteAccount, useMe } from '@/lib/store'

function DeleteForm() {
  const { me } = useMe()
  const router = useRouter()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ok = typed.trim().toUpperCase() === 'DELETE'
  const submit = async () => {
    if (!ok || busy) return
    setBusy(true)
    setError('')
    try {
      await deleteAccount()
      router.push('/')
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <>
      <TopBar title="Delete account" back="/profile/edit/" />
      <form className="stack gap-16 pad narrow" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <h1 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>This permanently deletes your account</h1>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#D7D0DA', lineHeight: 1.5 }} className="stack gap-8">
          <li>Your profile, comments, list and watch history</li>
          <li>{me!.coins} coins and every episode you unlocked</li>
          <li>Sign-in with {me!.user.via === 'Google' ? 'Google' : 'email'} for this account</li>
        </ul>
        {me!.subscription.state === 'active' && <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--gold-bg)', color: 'var(--gold)', lineHeight: 1.5 }} className="small">In the apps VIP is billed by Google Play or the App Store. Cancel it there first, or it keeps renewing.</div>}
        <div className="field">
          <label htmlFor="cf">Type DELETE to confirm</label>
          <input id="cf" className="input" autoComplete="off" placeholder="DELETE" value={typed} onChange={(e) => setTyped(e.target.value)} style={{ letterSpacing: 1 }} />
        </div>
        {error && <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>{error}</p>}
        <button type="submit" className="btn btn-block" disabled={!ok || busy} style={ok ? { background: '#C21D3F', color: '#FFFFFF' } : undefined}>Delete my account</button>
        <Link href="/profile/edit/" className="btn btn-ghost btn-block" style={{ color: '#FFFFFF' }}>Keep my account</Link>
        <p className="tiny faint" style={{ margin: 0, textAlign: 'center' }}>Purchase records are kept for bookkeeping without your name or email.</p>
      </form>
    </>
  )
}

export default function DeleteAccountPage() {
  return <AppShell tabs={false}><RequireSignIn><DeleteForm /></RequireSignIn></AppShell>
}
