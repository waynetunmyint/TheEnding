'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, TopBar, useHydrated, useToast } from '@/components/shell'
import { Coin, CrownIcon, Icon } from '@/components/ui'
import { COIN_PACKS } from '@/data/dummy'
import { useDemo } from '@/lib/demo-store'

export default function StorePage() {
  const s = useDemo()
  const hydrated = useHydrated()
  const [toast, show] = useToast()
  const [pick, setPick] = useState(1)
  const cur = COIN_PACKS[pick]
  return (
    <AppShell tabs={false}>
      <TopBar title="Coin Store" back="/me/" right={<Link href="/wallet/" className="btn btn-ghost btn-sm">Records</Link>} />
      <div className="stack gap-16 pad narrow" style={{ paddingTop: 8 }}>
        <div className="stack gap-6">
          <span className="small muted">Your balance</span>
          <span className="row" style={{ gap: 8, fontSize: 34, fontWeight: 900 }}><Coin size={30} />{hydrated ? s.coins : '—'}</span>
          <span className="small faint">Most episodes cost 60 coins.</span>
        </div>
        <Link href="/vip/" className="row" style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--gold-bg)', color: 'var(--gold)', textDecoration: 'none' }}>
          <CrownIcon size={26} />
          <span className="stack" style={{ flex: 1, gap: 2 }}><strong>VIP watches everything</strong><span className="small" style={{ color: '#D9B571' }}>Cheaper than coins if you binge</span></span>
          <Icon name="chevron" size={16} width={2.4} />
        </Link>
        <div role="radiogroup" aria-label="Coin packs" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {COIN_PACKS.map((p, i) => (
            <button key={p.id} type="button" role="radio" aria-checked={pick === i} onClick={() => setPick(i)}
              style={{ position: 'relative', minHeight: 92, borderRadius: 16, border: `2px solid ${pick === i ? '#FF5C7A' : 'transparent'}`, background: pick === i ? 'var(--accent-soft)' : 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4, padding: '0 14px', textAlign: 'left' }}>
              {p.tag && <span style={{ position: 'absolute', top: -1, right: -1, fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: '0 14px 0 8px', background: 'var(--primary)' }}>{p.tag}</span>}
              <span className="row" style={{ gap: 6, fontSize: 20, fontWeight: 800 }}><Coin />{p.coins}{p.bonus > 0 && <span style={{ fontSize: 13, color: '#FFC46B' }}>+{p.bonus}</span>}</span>
              <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{p.price}</span>
            </button>
          ))}
        </div>
        <Link href={`/payment/?status=success&pack=${cur.id}&return=${encodeURIComponent('/store/')}`} className="btn btn-primary btn-block" style={{ minHeight: 54 }}>
          Pay {cur.price} · get {cur.coins + cur.bonus} coins
        </Link>
        <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => show('No purchases to restore (demo)')}>Restore purchases</button>
          <Link href="/about/" className="btn btn-ghost btn-sm">Coin terms</Link>
        </div>
        <p className="tiny faint" style={{ margin: 0, textAlign: 'center' }}>Demo: no real payment is made. The apps pay through Google Play or the App Store.</p>
      </div>
      {toast}
    </AppShell>
  )
}
