'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CrownIcon, Icon } from '@/components/ui'
import { useConfig } from '@/lib/data'
import { fmtDate } from '@/lib/format'
import { claimTask, rememberReferral, updateMe, useMe } from '@/lib/store'

const TABS = [
  { href: '/', label: 'Home', icon: 'home', match: ['/', '/rankings/', '/new/', '/genres/'] },
  { href: '/shorts/', label: 'Shorts', icon: 'shorts', match: ['/shorts/'] },
  { href: '/rewards/', label: 'Rewards', icon: 'gift', match: ['/rewards/'] },
  { href: '/my-list/', label: 'My List', icon: 'bookmark', match: ['/my-list/', '/history/'] },
  { href: '/me/', label: 'Me', icon: 'user', match: ['/me/'] },
]

const noop = () => () => {}
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false)
}

/** The id segment of a dynamic route such as /drama/<id>/ (exported once as "_"). */
export function useRouteId(index: number): string {
  const path = usePathname() || ''
  return decodeURIComponent(path.split('/').filter(Boolean)[index] ?? '')
}

function useActiveTab() {
  const path = usePathname() || '/'
  const p = path.endsWith('/') ? path : `${path}/`
  return TABS.find((t) => t.match.includes(p))?.href
}

/** Subscription status bar pinned on top of the tab bar. Hidden until the backend state is known. */
export function SubBar() {
  const { me, status } = useMe()
  if (status !== 'ready' || !me) return null
  const sub = me.subscription
  const gold = { background: '#2A2112', color: '#F2C46D' }
  const view = {
    none: { style: gold, label: 'VIP', detail: 'Unlock every episode, no ads', action: 'Join' },
    active: { style: gold, label: 'VIP active', detail: `${sub.plan} · until ${fmtDate(sub.until)}`, action: 'Manage' },
    pending: { style: { background: '#1E2533', color: '#9CC3FF' }, label: 'Payment pending', detail: `VIP ${sub.plan} is being confirmed`, action: 'View' },
    expired: { style: { background: '#2B1A1E', color: '#FF8FA0' }, label: 'VIP expired', detail: `Ended ${fmtDate(sub.until)} · renew to keep watching`, action: 'Renew' },
    failed: { style: { background: '#2B1A1E', color: '#FF8FA0' }, label: "Payment didn't go through", detail: `VIP ${sub.plan} · you weren't charged`, action: 'Retry' },
  }[sub.state]
  return (
    <Link href={sub.state === 'pending' ? '/wallet/' : '/vip/'} className="subbar" style={view.style}>
      <CrownIcon size={16} color={view.style.color} />
      <strong>{view.label}</strong>
      <span className="detail">{view.detail}</span>
      <strong>{view.action}</strong>
      <Icon name="chevron" size={14} width={2.4} />
    </Link>
  )
}

function DemoNote() {
  return <div className="demo-note">Demo build · sign-in, payments and ads are simulated</div>
}

function NotifyOptIn() {
  const { me } = useMe()
  if (!me?.user.signedIn || me.notifyPrompted) return null
  const done = () => updateMe({ notifyPrompted: true }).catch(() => {})
  const allow = async () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        if ((await Notification.requestPermission()) === 'granted' && me.tasks.some((t) => t.key === 'notify' && t.claimable)) {
          await claimTask('notify').catch(() => {})
        }
      }
    } catch {
      // Unsupported browser: the in-app inbox still works.
    }
    await done()
  }
  return (
    <div className="backdrop center">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="nt">
        <div className="icon-circle"><Icon name="bell" size={30} /></div>
        <h2 id="nt">Never miss the next episode</h2>
        <p>We&apos;ll tell you when new episodes of dramas you follow drop, and when your daily coins are ready.</p>
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={allow}>Allow</button>
        <button type="button" className="btn btn-ghost btn-block" onClick={done}>Not now</button>
      </div>
    </div>
  )
}

function Maintenance() {
  return (
    <main className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      <img src="/logo.png" alt="" width={56} height={78} style={{ objectFit: 'contain' }} />
      <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800 }}>Back soon</h1>
      <p>The Ending is getting an update. Your coins, list and progress are safe.</p>
      <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>Try again</button>
    </main>
  )
}

export function AppShell({ children, tabs = true, flush = false }: { children: ReactNode; tabs?: boolean; flush?: boolean }) {
  const active = useActiveTab()
  const config = useConfig()
  const { me } = useMe()
  useEffect(() => { rememberReferral() }, [])
  if (config.data?.maintenance && !me?.user.role) return <Maintenance />
  return (
    <div className={`app${tabs ? '' : ' no-tabs'}${flush ? ' flush' : ''}`}>
      <aside className="sidebar" aria-label="Main">
        <Link href="/" className="brand"><img src="/logo.png" alt="" /><span>The Ending</span></Link>
        <nav className="side-nav">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="side-link" aria-current={active === t.href ? 'page' : undefined}>
              <Icon name={t.icon} size={22} />{t.label}
            </Link>
          ))}
          <Link href="/search/" className="side-link"><Icon name="search" size={22} />Search</Link>
        </nav>
        <SubBar />
      </aside>
      <div className="app-content">
        <DemoNote />
        <main className="app-main">{children}</main>
      </div>
      {tabs && (
        <div className="bottombar">
          <SubBar />
          <nav className="tabbar" aria-label="Main">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} className="tab" aria-current={active === t.href ? 'page' : undefined}>
                <Icon name={t.icon} size={24} />{t.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <NotifyOptIn />
    </div>
  )
}

export function TopBar({ title, back = '/', right, children }: { title?: string; back?: string; right?: ReactNode; children?: ReactNode }) {
  const router = useRouter()
  const goBack = () => {
    if (window.history.length > 1) router.back()
    else router.push(back)
  }
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" aria-label="Back" onClick={goBack}><Icon name="back" width={2.2} /></button>
      {children ?? <h1>{title}</h1>}
      {right ?? (children ? null : <span className="spacer" />)}
    </header>
  )
}

export function HomeHeader() {
  const path = usePathname()
  const items = [
    { href: '/', label: 'For You' },
    { href: '/rankings/', label: 'Rankings' },
    { href: '/new/', label: 'New' },
    { href: '/genres/', label: 'Genres' },
  ]
  return (
    <header className="home-head">
      <nav className="home-tabs" aria-label="Home sections">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="home-tab" aria-current={path === i.href ? 'page' : undefined}>{i.label}</Link>
        ))}
      </nav>
      <Link href="/search/" className="icon-btn" aria-label="Search"><Icon name="search" width={2.2} /></Link>
    </header>
  )
}

export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const show = useCallback((m: string) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 2600)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [msg ? <div className="toast" role="status">{msg}</div> : null, show]
}

/** Loading spinner, or an offline/server error with retry. */
export function LoadState({ error, onRetry, compact }: { error?: { status: number; message: string } | string; onRetry?: () => void; compact?: boolean }) {
  if (!error) {
    return <div className="empty" role="status" aria-label="Loading" style={compact ? { padding: 32 } : undefined}><div className="spinner" /></div>
  }
  const message = typeof error === 'string' ? error : error.message
  const offline = typeof error !== 'string' && error.status === 0
  return (
    <div className="empty" role="alert" style={compact ? { padding: 32 } : undefined}>
      <div className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}><Icon name={offline ? 'wifiOff' : 'alert'} size={30} /></div>
      <h2>{offline ? "You're offline" : 'Something went wrong'}</h2>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function RequireSignIn({ children }: { children: ReactNode }) {
  const { me, status, error } = useMe()
  if (status === 'error') return <LoadState error={error} onRetry={() => window.location.reload()} />
  if (!me) return <LoadState />
  if (!me.user.signedIn) {
    return (
      <div className="empty">
        <div className="icon-circle"><Icon name="user" size={30} /></div>
        <h2>Sign in to continue</h2>
        <p>Keep your coins, list and progress safe across phone and web.</p>
        <Link href="/login/" className="btn btn-primary" style={{ marginTop: 8 }}>Sign in</Link>
      </div>
    )
  }
  return <>{children}</>
}
