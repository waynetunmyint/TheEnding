'use client'

import Link from 'next/link'
import { AppShell, LoadState } from '@/components/shell'
import { Avatar, Coin, CrownIcon, Icon } from '@/components/ui'
import { LANGUAGES } from '@/lib/constants'
import { useConfig } from '@/lib/data'
import { fmtDate } from '@/lib/format'
import { useMe } from '@/lib/store'

function Row({ href, label, value, badge }: { href: string; label: string; value?: string; badge?: number }) {
  return (
    <Link href={href} className="list-row">
      <span className="grow">{label}</span>
      {badge ? <span className="badge-dot">{badge}</span> : null}
      {value && <span className="small faint">{value}</span>}
      <Icon name="chevron" size={16} width={2.4} style={{ color: 'var(--text-3)' }} />
    </Link>
  )
}

export default function MePage() {
  const { me, error } = useMe()
  const config = useConfig()
  if (!me) return <AppShell><LoadState error={error} onRetry={() => window.location.reload()} /></AppShell>
  const lang = LANGUAGES.find((l) => l.code === me.settings.language)?.english ?? 'English'
  const vip = me.subscription.state === 'active'

  return (
    <AppShell>
      <div className="stack gap-16 pad narrow" style={{ paddingTop: 24 }}>
        {me.user.signedIn ? (
          <Link href="/profile/edit/" className="row" style={{ gap: 14, color: '#FFFFFF', textDecoration: 'none' }}>
            <Avatar initial={me.user.initial} color={me.user.color} size={64} />
            <span className="stack" style={{ flex: 1, gap: 4, minWidth: 0 }}><strong style={{ fontSize: 20 }}>{me.user.name}</strong><span className="small faint">ID {me.user.id} · {me.user.via}</span></span>
            <Icon name="chevron" size={18} width={2.4} style={{ color: 'var(--text-3)' }} />
          </Link>
        ) : (
          <>
            <div className="row" style={{ gap: 14 }}>
              <span className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-3)' }}><Icon name="user" size={30} /></span>
              <span className="stack" style={{ gap: 4 }}><strong style={{ fontSize: 20 }}>Guest</strong><span className="small faint">Progress is saved to this browser&apos;s guest account</span></span>
            </div>
            <div className="stack gap-12" style={{ padding: 18, borderRadius: 16, background: 'var(--accent-soft)' }}>
              <strong style={{ fontSize: 17 }}>Sign in to keep your coins safe</strong>
              <span className="small" style={{ color: '#D7C3CB', lineHeight: 1.5 }}>Sync your list and progress across phone and web, and get {config.data?.tasks.signin ?? 30} bonus coins.</span>
              <Link href="/login/" className="btn btn-primary">Sign in</Link>
            </div>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <Link href="/wallet/" className="stack gap-6" style={{ padding: 14, borderRadius: 16, background: 'var(--surface)', color: '#FFFFFF', textDecoration: 'none' }}>
            <span className="small muted">Coins</span>
            <span className="row" style={{ gap: 6, fontSize: 22, fontWeight: 900 }}><Coin size={20} />{me.coins}</span>
            <span className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>Top up ›</span>
          </Link>
          <Link href="/vip/" className="stack gap-6" style={{ padding: 14, borderRadius: 16, background: 'var(--gold-bg)', color: 'var(--gold)', textDecoration: 'none' }}>
            <span className="small" style={{ color: '#D9B571' }}>Membership</span>
            <span className="row" style={{ gap: 6, fontSize: 22, fontWeight: 900 }}><CrownIcon size={20} />{vip ? 'VIP' : 'Free'}</span>
            <span className="small" style={{ color: '#D9B571' }}>{vip ? `Until ${fmtDate(me.subscription.until)}` : 'Join VIP ›'}</span>
          </Link>
        </div>

        <nav aria-label="Account" className="stack">
          {me.user.signedIn && <Row href="/inbox/" label="Notifications" badge={me.unread} />}
          <Row href="/store/" label="Coin store" />
          <Row href="/history/" label="Watch history" />
          <Row href="/rewards/" label="Invite friends" value={`+${config.data?.tasks.invite ?? 50} coins`} />
          <Row href="/settings/language/" label="Language" value={lang} />
          <Row href="/settings/" label="Settings" />
          <Row href="/help/" label="Help & feedback" />
          <Row href="/about/" label="About" />
          <Row href={me.user.role ? '/admin/' : '/admin/login/'} label="Admin panel" value={me.user.role || 'Demo'} />
        </nav>
      </div>
    </AppShell>
  )
}
