'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CrownIcon, Icon } from '@/components/ui'
import { resetDemo, update, useDemo } from '@/lib/demo-store'

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

function useActiveTab() {
  const path = usePathname() || '/'
  const p = path.endsWith('/') ? path : `${path}/`
  return TABS.find((t) => t.match.includes(p))?.href
}

export function SubBar() {
  const s = useDemo()
  const hydrated = useHydrated()
  // Hidden until the subscription state is known, never guessed.
  if (!hydrated) return null
  const vip = s.vip
  const style = { background: '#2A2112', color: '#F2C46D' }
  return (
    <Link href="/vip/" className="subbar" style={style}>
      <CrownIcon size={16} />
      <strong>{vip ? 'VIP active' : 'VIP'}</strong>
      <span className="detail">{vip ? `${vip.plan} · renews ${vip.renews}` : 'Unlock every episode, no ads'}</span>
      <strong>{vip ? 'Manage' : 'Join'}</strong>
      <Icon name="chevron" size={14} width={2.4} />
    </Link>
  )
}

function DemoNote() {
  const router = useRouter()
  return (
    <div className="demo-note">
      Demo · sample data, saved only in this browser
      <button type="button" onClick={() => { resetDemo(); router.push('/') }}>Reset</button>
    </div>
  )
}

function NotifyOptIn() {
  const s = useDemo()
  const hydrated = useHydrated()
  if (!hydrated || !s.signedIn || s.notifyPrompted) return null
  const done = () => update((x) => ({ ...x, notifyPrompted: true }))
  const allow = async () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
    } catch {
      // Unsupported browser: the in-app setting still records the choice.
    }
    done()
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

export function AppShell({ children, tabs = true }: { children: ReactNode; tabs?: boolean }) {
  const active = useActiveTab()
  return (
    <div className={`app${tabs ? '' : ' no-tabs'}`}>
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
    timer.current = setTimeout(() => setMsg(''), 2200)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [msg ? <div className="toast" role="status">{msg}</div> : null, show]
}

export function RequireSignIn({ children }: { children: ReactNode }) {
  const s = useDemo()
  const hydrated = useHydrated()
  if (!hydrated) return null
  if (!s.signedIn) {
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
