'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/shell'
import { Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { signInAsDemoAdmin } from '@/lib/store'

export default function AdminLoginPage() {
  const router = useRouter()
  const [toast, show] = useToast()
  const [busy, setBusy] = useState(false)
  const demo = async () => {
    setBusy(true)
    try {
      await signInAsDemoAdmin()
      router.push('/admin/')
    } catch (e) {
      show(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="stack gap-12" style={{ width: '100%', maxWidth: 380, alignItems: 'center', textAlign: 'center' }}>
        <img src="/logo.png" alt="The Ending logo" width={56} height={78} style={{ objectFit: 'contain' }} />
        <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800 }}>Admin sign in</h1>
        <p className="muted" style={{ margin: '0 0 12px', lineHeight: 1.5 }}>Only The Ending admins can open this panel. Each request is checked against the account&apos;s role.</p>
        <button type="button" className="btn btn-light btn-block" disabled={busy} onClick={demo}>Continue as the demo owner</button>
        <Link href={`/login/email/?next=${encodeURIComponent('/admin/')}`} className="btn btn-secondary btn-block"><Icon name="mail" size={18} />Sign in with email code</Link>
        <p className="tiny faint" style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
          Demo sign-in. To try other roles, use email code 123456 with editor@example.com, support@example.com or mod@example.com.
        </p>
      </div>
      {toast}
    </main>
  )
}
