'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppShell, RequireSignIn, TopBar, useToast } from '@/components/shell'
import { Avatar } from '@/components/ui'
import { update, useDemo } from '@/lib/demo-store'

function EditForm() {
  const s = useDemo()
  const router = useRouter()
  const [toast, show] = useToast()
  const [name, setName] = useState(s.user.name)
  const [confirmOut, setConfirmOut] = useState(false)
  const trimmed = name.trim()
  const save = () => {
    if (!trimmed) return
    update((x) => ({ ...x, user: { ...x.user, name: trimmed } }))
    show('Profile saved')
  }
  return (
    <>
      <TopBar title="Edit profile" back="/me/" right={<button type="button" className="btn btn-ghost btn-sm" style={{ color: trimmed ? 'var(--accent)' : 'var(--text-3)' }} disabled={!trimmed} onClick={save}>Save</button>} />
      <div className="stack gap-24 pad narrow" style={{ paddingTop: 8 }}>
        <div className="stack gap-8" style={{ alignItems: 'center' }}>
          <Avatar initial={trimmed[0] ?? s.user.name[0]} color="#7A3546" size={88} />
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => show('Photo upload comes with the real app')}>Change photo</button>
        </div>
        <div className="field">
          <label htmlFor="nm">Display name</label>
          <input id="nm" className="input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <span className="tiny faint">Shown on your comments.</span>
        </div>
        <div className="field">
          <label htmlFor="em">Email</label>
          <input id="em" className="input" value={s.user.email} readOnly style={{ color: 'var(--text-2)', background: '#15121A' }} />
        </div>
        <section aria-labelledby="sm">
          <h2 id="sm" className="label" style={{ margin: '0 0 4px' }}>Sign-in methods</h2>
          <div className="list-row"><span className="grow">Google</span><span className="small faint">{s.user.via === 'Google' ? 'Connected' : 'Not connected'}</span></div>
          <div className="list-row"><span className="grow">Email code</span><span className="small faint">Connected</span></div>
        </section>
        <div className="stack">
          <button type="button" className="list-row" style={{ fontWeight: 600, borderBottom: 'none' }} onClick={() => setConfirmOut(true)}>Sign out</button>
          <Link href="/delete-account/" className="list-row" style={{ fontWeight: 600, color: 'var(--bad)', borderBottom: 'none' }}>Delete account</Link>
        </div>
      </div>
      {confirmOut && (
        <div className="backdrop center">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="lo" aria-describedby="lod">
            <h2 id="lo">Sign out?</h2>
            <p id="lod">Your coins, VIP and list stay safe in your account. Sign in again any time to get them back.</p>
            <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={() => { update((x) => ({ ...x, signedIn: false, notifyPrompted: false })); router.push('/me/') }}>Sign out</button>
            <button type="button" className="btn btn-ghost btn-block" style={{ color: '#FFFFFF' }} onClick={() => setConfirmOut(false)}>Cancel</button>
          </div>
        </div>
      )}
      {toast}
    </>
  )
}

export default function EditProfilePage() {
  return (
    <AppShell tabs={false}>
      <RequireSignIn><EditForm /></RequireSignIn>
    </AppShell>
  )
}
