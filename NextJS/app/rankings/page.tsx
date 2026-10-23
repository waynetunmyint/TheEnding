'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, HomeHeader } from '@/components/shell'
import { PlayIcon, Poster } from '@/components/ui'
import { RANKINGS, RANKING_TABS, getDrama } from '@/data/dummy'

const MEDAL = ['#F2C46D', '#C9CED6', '#D89A6A']

export default function RankingsPage() {
  const [tab, setTab] = useState<(typeof RANKING_TABS)[number]>('Hot')
  const rows = RANKINGS[tab].map((id) => getDrama(id)!)
  return (
    <AppShell>
      <HomeHeader />
      <div role="tablist" aria-label="Ranking type" className="chips scroll pad" style={{ padding: '6px 16px 10px' }}>
        {RANKING_TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className="chip" onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <ol className="list pad narrow" style={{ maxWidth: 760, margin: 0 }}>
        {rows.map((d, i) => (
          <li key={d.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--surface)' }}>
            <span style={{ width: 26, flex: 'none', textAlign: 'center', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: MEDAL[i] ?? '#6E6874' }}>{i + 1}</span>
            <Link href={`/drama/${d.id}/`} style={{ width: 66, flex: 'none' }} aria-label={d.title}><Poster drama={d} showEps={false} badge={false} /></Link>
            <Link href={`/drama/${d.id}/`} className="stack gap-6" style={{ flex: 1, minWidth: 0, color: 'var(--text)', textDecoration: 'none' }}>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</span>
              <span className="tiny faint">{d.genres.slice(0, 2).join(' · ')} · {d.episodes} EP</span>
              {d.badge && <span className="tiny" style={{ color: '#FFC46B', fontWeight: 600 }}>{d.badge}</span>}
            </Link>
            <Link href={`/watch/${d.id}/`} aria-label={`Play ${d.title}`} className="icon-btn" style={{ background: 'var(--accent-soft)' }}><PlayIcon color="#FF5C7A" /></Link>
          </li>
        ))}
      </ol>
    </AppShell>
  )
}
