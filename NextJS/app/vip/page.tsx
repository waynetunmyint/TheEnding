'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, TopBar, useHydrated } from '@/components/shell'
import { CrownIcon, Icon } from '@/components/ui'
import { VIP_PLANS } from '@/data/dummy'
import { update, useDemo } from '@/lib/demo-store'

const PERKS = ['All episodes unlocked', 'No ads', '1080p and 4K', 'New dramas first', '+20 coins daily', 'Watch on web too']

export default function VipPage() {
  const s = useDemo()
  const hydrated = useHydrated()
  const [pick, setPick] = useState(1)
  const cur = VIP_PLANS[pick]
  return (
    <AppShell tabs={false}>
      <div style={{ background: '#120F0B', minHeight: '100dvh' }}>
        <TopBar back="/me/" />
        <div className="stack gap-24 pad narrow" style={{ paddingBottom: 32 }}>
          <div className="stack gap-8" style={{ alignItems: 'center', textAlign: 'center' }}>
            <CrownIcon size={48} />
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--gold)' }}>The Ending VIP</h1>
            <p style={{ margin: 0, color: '#D9CFC0' }}>Every episode, every drama. No waiting, no ads.</p>
          </div>

          {hydrated && s.vip && (
            <div role="status" className="stack gap-6" style={{ padding: '16px 18px', borderRadius: 16, background: 'var(--gold-bg)', color: 'var(--gold)' }}>
              <strong>You&apos;re VIP · {s.vip.plan}</strong>
              <span className="small" style={{ color: '#D9B571' }}>Renews {s.vip.renews}. Manage or cancel in Google Play or the App Store.</span>
              <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => update((x) => ({ ...x, vip: null }))}>End VIP (demo)</button>
            </div>
          )}

          <ul className="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 10px' }}>
            {PERKS.map((p) => <li key={p} className="row" style={{ gap: 8, fontSize: 14, color: '#F5EDE0' }}><Icon name="check" size={18} width={2.6} style={{ color: 'var(--gold)' }} />{p}</li>)}
          </ul>

          <div role="radiogroup" aria-label="VIP plans" className="stack gap-12">
            {VIP_PLANS.map((p, i) => (
              <button key={p.id} type="button" role="radio" aria-checked={pick === i} onClick={() => setPick(i)}
                style={{ position: 'relative', minHeight: 68, borderRadius: 16, border: `2px solid ${pick === i ? 'var(--gold)' : 'transparent'}`, background: pick === i ? 'var(--gold-bg)' : '#1E1914', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', textAlign: 'left' }}>
                <span className="stack" style={{ flex: 1, gap: 3 }}><strong style={{ fontSize: 16 }}>{p.name}</strong><span className="small" style={{ color: '#B8AC98' }}>{p.note}</span></span>
                <strong style={{ fontSize: 18 }}>{p.price}</strong>
                {p.tag && <span style={{ position: 'absolute', top: -10, left: 14, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'var(--gold)', color: '#2A1A00' }}>{p.tag}</span>}
              </button>
            ))}
          </div>

          <div className="stack gap-8">
            <Link href={`/payment/?status=success&plan=${cur.id}&return=${encodeURIComponent('/vip/')}`} className="btn btn-gold btn-block" style={{ minHeight: 54, fontWeight: 800 }}>Start {cur.name} VIP · {cur.price}</Link>
            <p className="tiny" style={{ margin: 0, color: '#9A9080', textAlign: 'center', lineHeight: 1.5 }}>
              {cur.name} plan renews automatically at {cur.price}. Cancel anytime in Google Play or App Store settings. Demo: no real payment. <Link href="/about/" style={{ color: 'var(--gold)' }}>Terms</Link>
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
