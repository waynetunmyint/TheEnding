'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { REVENUE_14D, RANKINGS, getDrama } from '@/data/dummy'

const RANGES = ['Today', '14 days', '90 days'] as const
const TILES: Record<(typeof RANGES)[number], [string, string, string][]> = {
  Today: [['Revenue', '$1,080', 'Coins + VIP'], ['New users', '214', 'Signed up today'], ['Active VIP', '1,128', 'Paying now'], ['Episodes unlocked', '3,902', 'Coins, ads and VIP']],
  '14 days': [['Revenue', '$10,460', 'Coins + VIP'], ['New users', '3,214', 'Signed up in range'], ['Active VIP', '1,128', 'Paying now'], ['Episodes unlocked', '48,903', 'Coins, ads and VIP']],
  '90 days': [['Revenue', '$58,210', 'Coins + VIP'], ['New users', '17,880', 'Signed up in range'], ['Active VIP', '1,128', 'Paying now'], ['Episodes unlocked', '291,447', 'Coins, ads and VIP']],
}

function day(i: number) {
  return `${String(10 + i).padStart(2, '0')}/10/2026`
}

export default function AdminDashboard() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('14 days')
  const [hover, setHover] = useState(-1)
  const max = 1200
  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Dashboard</h1>
        <div role="radiogroup" aria-label="Range" className="row" style={{ gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 4 }}>
          {RANGES.map((r) => <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)} className="btn btn-sm" style={{ minHeight: 34, borderRadius: 9, background: range === r ? 'var(--accent-soft)' : 'transparent', color: range === r ? '#FFFFFF' : 'var(--text-2)' }}>{r}</button>)}
        </div>
      </div>
      <p className="tiny faint" style={{ margin: '-10px 0 0' }}>Sample data for the mockup.</p>
      <div className="tiles">
        {TILES[range].map(([label, v, note]) => (
          <div key={label} className="tile"><span className="small muted">{label}</span><span className="v">{v}</span><span className="tiny faint">{note}</span></div>
        ))}
      </div>

      <section className="panel stack gap-12" aria-labelledby="rv">
        <div className="row between" style={{ flexWrap: 'wrap' }}>
          <h2 id="rv" style={{ margin: 0 }}>Revenue per day (USD), last 14 days</h2>
          <span className="small muted" aria-live="polite">{hover >= 0 ? `${day(hover)} · $${REVENUE_14D[hover].toLocaleString('en-US')}` : 'Hover or tap a bar'}</span>
        </div>
        <div style={{ position: 'relative', height: 220, display: 'flex', alignItems: 'flex-end', gap: 2, borderBottom: '1px solid #3A3340', marginTop: 16 }}>
          <span aria-hidden="true" className="tiny faint" style={{ position: 'absolute', left: 0, top: -18 }}>$1,200</span>
          <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTop: '1px dashed var(--surface-2)' }} />
          <span aria-hidden="true" className="tiny faint" style={{ position: 'absolute', left: 0, top: 'calc(50% - 18px)' }}>$600</span>
          <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed var(--surface-2)' }} />
          {REVENUE_14D.map((v, i) => (
            <button key={i} type="button" aria-label={`${day(i)}: $${v}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)} onClick={() => setHover(i)}
              style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', background: 'none', border: 'none', padding: 0 }}>
              <span style={{ width: '100%', height: `${(v / max) * 100}%`, borderRadius: '4px 4px 0 0', background: hover === i ? '#FF8FA0' : '#FF5C7A' }} />
            </button>
          ))}
        </div>
        <div className="row between tiny faint"><span>{day(0)}</span><span>{day(6)}</span><span>{day(13)}</span></div>
        <details>
          <summary className="small muted" style={{ cursor: 'pointer' }}>Show as table</summary>
          <table className="table" style={{ marginTop: 8 }}><thead><tr><th>Date</th><th>Revenue</th></tr></thead><tbody>{REVENUE_14D.map((v, i) => <tr key={i}><td>{day(i)}</td><td>${v.toLocaleString('en-US')}</td></tr>)}</tbody></table>
        </details>
      </section>

      <div className="two-col">
        <section className="panel main-col" style={{ gap: 0 }} aria-labelledby="na">
          <h2 id="na">Needs attention</h2>
          {[
            ['2 payments pending over 1 hour', 'Payments', '/admin/payments/', 'var(--warn)'],
            ['3 reported comments', 'Comments', '/admin/comments/', 'var(--accent)'],
            ['EP 42 of Reborn to Rule failed to process', 'Episodes', '/admin/dramas/reborn-empire/episodes/', 'var(--accent)'],
          ].map(([t, tag, href, dot]) => (
            <Link key={t} href={href} className="list-row" style={{ borderBottomColor: 'var(--surface-2)', fontSize: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: dot, flex: 'none' }} /><span className="grow">{t}</span><span className="small faint">{tag} ›</span>
            </Link>
          ))}
        </section>
        <section className="panel side-col" style={{ gap: 0 }} aria-labelledby="tp">
          <h2 id="tp">Top dramas this week</h2>
          {RANKINGS.Hot.slice(0, 4).map((id, i) => {
            const d = getDrama(id)!
            return (
              <Link key={id} href={`/admin/dramas/${id}/`} className="list-row" style={{ borderBottomColor: 'var(--surface-2)', fontSize: 14 }}>
                <span className="faint" style={{ width: 18, fontWeight: 700 }}>{i + 1}</span>
                <span className="grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                <span className="small muted">{[12410, 9882, 7305, 5190][i].toLocaleString('en-US')} unlocks</span>
              </Link>
            )
          })}
        </section>
      </div>
    </AdminShell>
  )
}
