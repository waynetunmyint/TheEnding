'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { update } from '@/lib/demo-store'

export default function AdminLoginPage() {
  const router = useRouter()
  const enter = () => { update((s) => ({ ...s, admin: true })); router.push('/admin/') }
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="stack gap-12" style={{ width: '100%', maxWidth: 380, alignItems: 'center', textAlign: 'center' }}>
        <img src="/logo.png" alt="The Ending logo" width={56} height={78} style={{ objectFit: 'contain' }} />
        <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800 }}>Admin sign in</h1>
        <p className="muted" style={{ margin: '0 0 12px', lineHeight: 1.5 }}>Only approved The Ending admins can open this panel.</p>
        <button type="button" className="btn btn-light btn-block" onClick={enter}>Continue with Google (demo)</button>
        <button type="button" className="btn btn-secondary btn-block" onClick={enter}><Icon name="mail" size={18} />Continue with email code (demo)</button>
        <Link href="/admin/forbidden/" className="small" style={{ marginTop: 4 }}>See what non-admins get</Link>
        <p className="tiny faint" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>Mockup with sample data. Nothing you change here is saved to a server. The real panel checks admin roles on the Go backend for every request.</p>
      </div>
    </main>
  )
}
