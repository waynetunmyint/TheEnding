'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, TopBar, useHydrated } from '@/components/shell'
import { Coin } from '@/components/ui'
import { useDemo } from '@/lib/demo-store'

const TABS = ['All', 'Earned', 'Spent'] as const

export default function WalletPage() {
  const s = useDemo()
  const hydrated = useHydrated()
  const [tab, setTab] = useState<(typeof TABS)[number]>('All')
  const rows = s.wallet.filter((r) => tab === 'All' || (tab === 'Earned' ? r.amount > 0 : r.amount < 0))
  return (
    <AppShell tabs={false}>
      <TopBar title="Wallet" back="/me/" />
      <div className="pad narrow">
        <div className="row" style={{ padding: '8px 0 18px' }}>
          <div className="stack gap-6" style={{ flex: 1 }}>
            <span className="small muted">Coins</span>
            <span className="row" style={{ gap: 8, fontSize: 32, fontWeight: 900 }}><Coin size={28} />{hydrated ? s.coins : '—'}</span>
          </div>
          <Link href="/store/" className="btn btn-primary btn-sm" style={{ minHeight: 44 }}>Top up</Link>
        </div>
        <div role="tablist" aria-label="Record type" className="row" style={{ gap: 22, borderBottom: '1px solid var(--surface)' }}>
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ minHeight: 40, background: 'none', border: 'none', padding: 0, fontWeight: 700, color: tab === t ? '#FFFFFF' : 'var(--text-3)', boxShadow: tab === t ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{t}</button>
          ))}
        </div>
        {hydrated && rows.length === 0 && <div className="empty" style={{ padding: '48px 16px' }}><h2>No records yet</h2><p>Coins you earn and spend show up here.</p></div>}
        <ul className="list">
          {hydrated && rows.map((r, i) => (
            <li key={`${r.when}-${i}`} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--surface)' }}>
              <div className="stack" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.what}</span>
                <span className="tiny faint">{r.when}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: r.amount > 0 ? '#FFC46B' : 'var(--text-2)' }}>{r.amount > 0 ? '+' : '−'}{Math.abs(r.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}
