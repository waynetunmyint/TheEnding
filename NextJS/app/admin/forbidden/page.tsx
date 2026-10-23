'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui'
import { useMe } from '@/lib/store'

export default function AdminForbiddenPage() {
  const { me } = useMe()
  const who = me?.user.email || me?.user.name
  return (
    <main role="alert" className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      <div className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}><Icon name="lock" size={30} /></div>
      <h1 style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 800 }}>This account isn&apos;t an admin</h1>
      <p>{who ? <>You&apos;re signed in as {who}. </> : null}Ask the owner to add you in Settings › Admins, or sign in with a different account.</p>
      <Link href="/admin/login/" className="btn btn-primary" style={{ marginTop: 8 }}>Use another account</Link>
      <Link href="/" className="btn btn-ghost">Go to The Ending</Link>
    </main>
  )
}
