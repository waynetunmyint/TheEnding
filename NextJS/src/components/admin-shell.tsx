'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useHydrated } from '@/components/shell'
import { update, useDemo } from '@/lib/demo-store'

const NAV = [
  { href: '/admin/', label: 'Dashboard' },
  { href: '/admin/dramas/', label: 'Dramas & episodes' },
  { href: '/admin/home/', label: 'Home curation' },
  { href: '/admin/users/', label: 'Users' },
  { href: '/admin/payments/', label: 'Payments', badge: '2' },
  { href: '/admin/comments/', label: 'Comments', badge: '3' },
  { href: '/admin/monetization/', label: 'Coins, VIP & rewards' },
  { href: '/admin/notifications/', label: 'Notifications' },
  { href: '/admin/settings/', label: 'Settings' },
]

function activeHref(path: string) {
  const p = path.endsWith('/') ? path : `${path}/`
  if (p === '/admin/') return '/admin/'
  return NAV.filter((n) => n.href !== '/admin/' && p.startsWith(n.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href
}

export function AdminShell({ children }: { children: ReactNode }) {
  const s = useDemo()
  const hydrated = useHydrated()
  const path = usePathname() || '/admin/'
  const router = useRouter()
  const active = activeHref(path)

  if (!hydrated) return <div className="admin" />
  if (!s.admin) {
    return (
      <main className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
        <img src="/logo.png" alt="" width={56} height={78} style={{ objectFit: 'contain' }} />
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800 }}>Admin sign in required</h1>
        <p>Sign in with an admin account to open the panel.</p>
        <Link href="/admin/login/" className="btn btn-primary" style={{ marginTop: 8 }}>Sign in</Link>
      </main>
    )
  }

  return (
    <div className="admin">
      <aside className="admin-side" aria-label="Admin">
        <Link href="/admin/" className="brand"><img src="/logo.png" alt="" /><span className="stack"><span>The Ending</span><small className="faint" style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0 }}>Admin · demo data</small></span></Link>
        <nav className="admin-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active === n.href ? 'page' : undefined}>
              <span style={{ flex: 1 }}>{n.label}</span>{n.badge && <span className="badge-dot" style={{ fontSize: 11 }}>{n.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="stack gap-8" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <span className="small" style={{ fontWeight: 600 }}>Wayne Tun Myint</span>
          <span className="tiny faint">Owner</span>
          <div className="row small" style={{ gap: 14 }}>
            <Link href="/">View site</Link>
            <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, minHeight: 32 }} onClick={() => { update((x) => ({ ...x, admin: false })); router.push('/admin/login/') }}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}

export function StatusText({ value }: { value: string }) {
  const color: Record<string, string> = {
    Published: 'var(--good)', Active: 'var(--good)', Paid: 'var(--good)', Ready: 'var(--good)', Sent: 'var(--good)',
    Scheduled: 'var(--info)', Refunded: 'var(--info)', Converting: 'var(--info)',
    Pending: 'var(--warn)', Draft: 'var(--text-2)', Waiting: 'var(--text-3)',
    Failed: 'var(--bad)', Banned: 'var(--bad)',
  }
  return <span className="status" style={{ color: color[value] ?? 'var(--text-2)' }}>{value}</span>
}
