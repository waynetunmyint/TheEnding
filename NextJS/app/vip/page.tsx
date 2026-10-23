'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, LoadState, TopBar, useToast } from '@/components/shell'
import { CrownIcon, Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useConfig } from '@/lib/data'
import { fmtDate, price } from '@/lib/format'
import { cancelVip, useMe } from '@/lib/store'

export default function VipPage() {
  const { me } = useMe()
  const config = useConfig()
  const [toast, show] = useToast()
  const [pick, setPick] = useState(1)
  const plans = config.data?.vipPlans ?? []
  const cur = plans[Math.min(pick, plans.length - 1)]
  const sub = me?.subscription
  const perks = ['All episodes unlocked', 'No ads', '1080p and 4K', 'New dramas first', `+${config.data?.vipBonus ?? 20} coins on check-in`, 'Watch on web too']
  return (
    <AppShell tabs={false}>
      <div style={{ background: '#120F0B', minHeight: '100dvh' }}>
        <TopBar back="/me/" />
        {!config.data ? <LoadState error={config.error} onRetry={config.reload} /> : (
          <div className="stack gap-24 pad narrow" style={{ paddingBottom: 32 }}>
            <div className="stack gap-8" style={{ alignItems: 'center', textAlign: 'center' }}>
              <CrownIcon size={48} />
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--gold)' }}>The Ending VIP</h1>
              <p style={{ margin: 0, color: '#D9CFC0' }}>Every episode, every drama. No waiting, no ads.</p>
            </div>

            {sub?.state === 'active' && (
              <div role="status" className="stack gap-6" style={{ padding: '16px 18px', borderRadius: 16, background: 'var(--gold-bg)', color: 'var(--gold)' }}>
                <strong>You&apos;re VIP · {sub.plan}</strong>
                <span className="small" style={{ color: '#D9B571' }}>Active until {fmtDate(sub.until)}. In the apps you manage or cancel VIP in Google Play or the App Store.</span>
                <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => cancelVip().then(() => show('VIP ended'), (e) => show(errorMessage(e)))}>End VIP now (demo)</button>
              </div>
            )}
            {sub?.state === 'pending' && <div role="status" className="small" style={{ padding: '14px 16px', borderRadius: 16, background: '#1E2533', color: 'var(--info)' }}>Your VIP {sub.plan} payment is being confirmed. You don&apos;t need to pay again.</div>}
            {sub?.state === 'failed' && <div role="status" className="small" style={{ padding: '14px 16px', borderRadius: 16, background: '#2B1A1E', color: 'var(--bad)' }}>Your last VIP payment didn&apos;t go through. You weren&apos;t charged; pick a plan to try again.</div>}
            {sub?.state === 'expired' && <div role="status" className="small" style={{ padding: '14px 16px', borderRadius: 16, background: '#2B1A1E', color: 'var(--bad)' }}>Your VIP ended on {fmtDate(sub.until)}. Renew to keep watching everything.</div>}

            <ul className="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 10px' }}>
              {perks.map((p) => <li key={p} className="row" style={{ gap: 8, fontSize: 14, color: '#F5EDE0' }}><Icon name="check" size={18} width={2.6} style={{ color: 'var(--gold)' }} />{p}</li>)}
            </ul>

            <div role="radiogroup" aria-label="VIP plans" className="stack gap-12">
              {plans.map((p, i) => (
                <button key={p.id} type="button" role="radio" aria-checked={pick === i} onClick={() => setPick(i)}
                  style={{ position: 'relative', minHeight: 68, borderRadius: 16, border: `2px solid ${pick === i ? 'var(--gold)' : 'transparent'}`, background: pick === i ? 'var(--gold-bg)' : '#1E1914', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', textAlign: 'left' }}>
                  <span className="stack" style={{ flex: 1, gap: 3 }}><strong style={{ fontSize: 16 }}>{p.name}</strong>{p.note && <span className="small" style={{ color: '#B8AC98' }}>{p.note}</span>}</span>
                  <strong style={{ fontSize: 18 }}>{price(p.priceCents)}</strong>
                  {p.tag && <span style={{ position: 'absolute', top: -10, left: 14, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'var(--gold)', color: '#2A1A00' }}>{p.tag}</span>}
                </button>
              ))}
            </div>

            {cur && (
              <div className="stack gap-8">
                {me?.user.signedIn
                  ? <Link href={`/payment/?product=${cur.id}&return=${encodeURIComponent('/vip/')}`} className="btn btn-gold btn-block" style={{ minHeight: 54, fontWeight: 800 }}>{sub?.state === 'active' ? `Add ${cur.name} VIP` : `Start ${cur.name} VIP`} · {price(cur.priceCents)}</Link>
                  : <Link href="/login/" className="btn btn-gold btn-block" style={{ minHeight: 54, fontWeight: 800 }}>Sign in to join VIP</Link>}
                <p className="tiny" style={{ margin: 0, color: '#9A9080', textAlign: 'center', lineHeight: 1.5 }}>
                  {cur.name} plan renews automatically at {price(cur.priceCents)}. Cancel anytime in Google Play or App Store settings. Demo checkout: no real payment. <Link href="/about/#coins" style={{ color: 'var(--gold)' }}>Terms</Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {toast}
    </AppShell>
  )
}
