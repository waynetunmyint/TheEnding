'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { LoadState } from '@/components/shell'
import { Icon } from '@/components/ui'
import { useApi } from '@/lib/data'
import { signOut, useMe } from '@/lib/store'
import type { AdminMe } from '@/lib/types'

const NAV = [
  { href: '/admin/', label: 'Dashboard' },
  { href: '/admin/dramas/', label: 'Dramas & episodes' },
  { href: '/admin/home/', label: 'Home curation' },
  { href: '/admin/users/', label: 'Users' },
  { href: '/admin/payments/', label: 'Payments', badge: 'payments' as const },
  { href: '/admin/comments/', label: 'Comments', badge: 'comments' as const },
  { href: '/admin/monetization/', label: 'Coins, VIP & rewards' },
  { href: '/admin/notifications/', label: 'Notifications' },
  { href: '/admin/settings/', label: 'Settings' },
]

function activeHref(path: string) {
  const p = path.endsWith('/') ? path : `${path}/`
  if (p === '/admin/') return '/admin/'
  return NAV.filter((n) => n.href !== '/admin/' && p.startsWith(n.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href
}

/** The signed-in admin, their role and write permissions. The API checks every request too. */
export function useAdmin() {
  const { me } = useMe()
  const q = useApi<AdminMe>(me?.user.role ? `/admin/me?u=${me.user.id}` : null)
  return { ...q, can: (perm: string) => q.data?.perms.includes(perm) ?? false }
}

/** Shown next to controls the current role can't use. */
export function RoleNote({ perm, admin }: { perm: string; admin: ReturnType<typeof useAdmin> }) {
  if (admin.can(perm)) return null
  const who = { content: 'Editors', notify: 'Editors', users: 'Support', payments: 'Support', comments: 'Moderators', settings: 'the Owner' }[perm] ?? 'other roles'
  return <p className="small faint" style={{ margin: 0 }}>View only. Only {who} (and the Owner) can change this.</p>
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { me, status, error } = useMe()
  const admin = useAdmin()
  const path = usePathname() || '/admin/'
  const router = useRouter()
  const active = activeHref(path)
  const forbidden = !!me?.user.signedIn && (!me.user.role || admin.error?.status === 403)
  useEffect(() => { if (forbidden) router.replace('/admin/forbidden/') }, [forbidden, router])

  if (status === 'error') return <LoadState error={error} onRetry={() => window.location.reload()} />
  if (!me) return <div className="admin"><LoadState /></div>
  if (!me.user.signedIn) {
    return (
      <main className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
        <img src="/logo.png" alt="" width={56} height={78} style={{ objectFit: 'contain' }} />
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800 }}>Admin sign in required</h1>
        <p>Sign in with an admin account to open the panel.</p>
        <Link href="/admin/login/" className="btn btn-primary" style={{ marginTop: 8 }}>Sign in</Link>
      </main>
    )
  }
  if (forbidden) return null
  if (!admin.data) return <div className="admin"><LoadState error={admin.error} onRetry={admin.reload} /></div>
  const out = async () => {
    await signOut().catch(() => {})
    router.push('/admin/login/')
  }

  return (
    <div className="admin">
      <aside className="admin-side" aria-label="Admin">
        <Link href="/admin/" className="brand"><img src="/logo.png" alt="" /><span className="stack"><span>The Ending</span><small className="faint" style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0 }}>Admin</small></span></Link>
        <nav className="admin-nav">
          {NAV.map((n) => {
            const count = n.badge ? admin.data!.badges[n.badge] : 0
            return (
              <Link key={n.href} href={n.href} aria-current={active === n.href ? 'page' : undefined}>
                <span style={{ flex: 1 }}>{n.label}</span>{count > 0 && <span className="badge-dot" style={{ fontSize: 11 }}>{count}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="stack gap-8" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <span className="small" style={{ fontWeight: 600 }}>{admin.data.name}</span>
          <span className="tiny faint">{admin.data.role}</span>
          <div className="row small" style={{ gap: 14 }}>
            <Link href="/">View site</Link>
            <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, minHeight: 32 }} onClick={out}>Sign out</button>
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
    Scheduled: 'var(--info)', Refunded: 'var(--info)', Converting: 'var(--info)', Uploading: 'var(--info)',
    Pending: 'var(--warn)', Draft: 'var(--text-2)', Waiting: 'var(--text-3)', None: 'var(--text-3)', Canceled: 'var(--text-3)',
    Failed: 'var(--bad)', Banned: 'var(--bad)',
  }
  return <span className="status" style={{ color: color[value] ?? 'var(--text-2)' }}>{value === 'None' ? 'No video' : value}</span>
}

export function Breadcrumb({ parent, href, current }: { parent: string; href: string; current: string }) {
  return <nav aria-label="Breadcrumb" className="small faint"><Link href={href}>{parent}</Link> / {current}</nav>
}

export function EmptyPanel({ title, body, icon = 'shorts' }: { title: string; body: string; icon?: string }) {
  return (
    <div className="empty panel">
      <div className="icon-circle"><Icon name={icon} size={30} /></div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  )
}
