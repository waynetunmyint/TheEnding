'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StatusText } from '@/components/admin-shell'
import { AppShell, LoadState, TopBar } from '@/components/shell'
import { Coin } from '@/components/ui'
import { useApi } from '@/lib/data'
import { fmtStamp, price } from '@/lib/format'
import { useMe } from '@/lib/store'
import type { Payment, WalletEntry } from '@/lib/types'

const TABS = ['All', 'Earned', 'Spent', 'Purchases'] as const

export default function WalletPage() {
  const { me } = useMe()
  const [tab, setTab] = useState<(typeof TABS)[number]>('All')
  const wallet = useApi<WalletEntry[]>(me ? `/wallet?u=${me.user.id}` : null)
  const payments = useApi<Payment[]>(me?.user.signedIn ? `/payments?u=${me.user.id}` : null)
  const rows = (wallet.data ?? []).filter((r) => tab === 'All' || (tab === 'Earned' ? r.amount > 0 : r.amount < 0))
  const pending = (payments.data ?? []).filter((p) => p.status === 'Pending')
  const tabs = TABS.filter((t) => t !== 'Purchases' || me?.user.signedIn)
  return (
    <AppShell tabs={false}>
      <TopBar title="Wallet" back="/me/" />
      <div className="pad narrow">
        <div className="row" style={{ padding: '8px 0 18px' }}>
          <div className="stack gap-6" style={{ flex: 1 }}>
            <span className="small muted">Coins</span>
            <span className="row" style={{ gap: 8, fontSize: 32, fontWeight: 900 }}><Coin size={28} />{me ? me.coins : '—'}</span>
          </div>
          <Link href="/store/" className="btn btn-primary btn-sm" style={{ minHeight: 44 }}>Top up</Link>
        </div>
        {pending.length > 0 && tab !== 'Purchases' && (
          <button type="button" onClick={() => setTab('Purchases')} className="stack gap-6" style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 16, background: '#1E2533', color: 'var(--info)', border: 'none', marginBottom: 14 }}>
            <strong>{pending.length === 1 ? '1 payment is' : `${pending.length} payments are`} pending</strong>
            <span className="small">Coins or VIP are added the moment the store confirms. Order {pending[0].order}.</span>
          </button>
        )}
        <div role="tablist" aria-label="Record type" className="row" style={{ gap: 22, borderBottom: '1px solid var(--surface)' }}>
          {tabs.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ minHeight: 40, background: 'none', border: 'none', padding: 0, fontWeight: 700, color: tab === t ? '#FFFFFF' : 'var(--text-3)', boxShadow: tab === t ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{t}</button>
          ))}
        </div>
        {tab === 'Purchases' ? (
          !payments.data ? <LoadState error={payments.error} onRetry={payments.reload} compact /> : payments.data.length === 0
            ? <div className="empty" style={{ padding: '48px 16px' }}><h2>No purchases yet</h2><p>Coin packs and VIP you buy show up here.</p></div>
            : (
              <ul className="list">
                {payments.data.map((p) => (
                  <li key={p.order} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--surface)' }}>
                    <div className="stack" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{p.item}</span>
                      <span className="tiny faint">{fmtStamp(p.at)} · {p.order}</span>
                    </div>
                    <span className="stack" style={{ alignItems: 'flex-end', gap: 3 }}><strong>{price(p.amountCents)}</strong><StatusText value={p.status} /></span>
                  </li>
                ))}
              </ul>
            )
        ) : !wallet.data ? <LoadState error={wallet.error} onRetry={wallet.reload} compact /> : rows.length === 0 ? (
          <div className="empty" style={{ padding: '48px 16px' }}><h2>No records yet</h2><p>Coins you earn and spend show up here.</p></div>
        ) : (
          <ul className="list">
            {rows.map((r, i) => (
              <li key={`${r.at}-${i}`} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--surface)' }}>
                <div className="stack" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.what}</span>
                  <span className="tiny faint">{fmtStamp(r.at)}</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: r.amount > 0 ? '#FFC46B' : 'var(--text-2)' }}>{r.amount > 0 ? '+' : '−'}{Math.abs(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
