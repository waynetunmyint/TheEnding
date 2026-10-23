'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppShell, RequireSignIn, TopBar, useToast } from '@/components/shell'
import { Avatar } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { signOut, updateMe, useMe } from '@/lib/store'

function EditForm() {
  const { me } = useMe()
  const router = useRouter()
  const [toast, show] = useToast()
  const [name, setName] = useState(me!.user.name)
  const [confirmOut, setConfirmOut] = useState(false)
  const trimmed = name.trim()
  const u = me!.user
  const save = () => {
    if (!trimmed) return
    updateMe({ name: trimmed }).then(() => show('Profile saved'), (e) => show(errorMessage(e)))
  }
  const out = async () => {
    try {
      await signOut()
      router.push('/me/')
    } catch (e) {
      show(errorMessage(e))
    }
  }
  return (
    <>
      <TopBar title="Edit profile" back="/me/" right={<button type="button" className="btn btn-ghost btn-sm" style={{ color: trimmed && trimmed !== u.name ? 'var(--accent)' : 'var(--text-3)' }} disabled={!trimmed || trimmed === u.name} onClick={save}>Save</button>} />
      <div className="stack gap-24 pad narrow" style={{ paddingTop: 8 }}>
        <div className="stack gap-8" style={{ alignItems: 'center' }}>
          <Avatar initial={trimmed[0]?.toUpperCase() ?? u.initial} color={u.color} size={88} />
        </div>
        <div className="field">
          <label htmlFor="nm">Display name</label>
          <input id="nm" className="input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <span className="tiny faint">Shown on your comments.</span>
        </div>
        {u.email && (
          <div className="field">
            <label htmlFor="em">Email</label>
            <input id="em" className="input" value={u.email} readOnly style={{ color: 'var(--text-2)', background: '#15121A' }} />
          </div>
        )}
        <section aria-labelledby="sm">
          <h2 id="sm" className="label" style={{ margin: '0 0 4px' }}>Sign-in method</h2>
          <div className="list-row"><span className="grow">{u.via}</span><span className="small faint">Connected</span></div>
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
            <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={out}>Sign out</button>
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
