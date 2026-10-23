'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { LoadState } from '@/components/shell'
import { useApi } from '@/lib/data'
import { fmtDate, fmtStamp, money } from '@/lib/format'

type Dashboard = {
  revenueCents: number; newUsers: number; activeVip: number; unlocks: number
  revenue14: { day: number; cents: number }[]
  attention: { text: string; tag: string; href: string; tone: string }[]
  top: { id: string; title: string; unlocks: number }[]
  help: { id: number; userId: number; name: string; topic: string; message: string; at: number }[]
}

const RANGES = [['today', 'Today'], ['14d', '14 days'], ['90d', '90 days']] as const

export default function AdminDashboard() {
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('14d')
  const [hover, setHover] = useState(-1)
  const q = useApi<Dashboard>(`/admin/dashboard?range=${range}`)
  const d = q.data
  const max = d ? Math.max(100, ...d.revenue14.map((x) => x.cents)) : 100
  const label = RANGES.find((r) => r[0] === range)![1]
  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Dashboard</h1>
        <div role="radiogroup" aria-label="Range" className="row" style={{ gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 4 }}>
          {RANGES.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={range === k} onClick={() => setRange(k)} className="btn btn-sm" style={{ minHeight: 34, borderRadius: 9, background: range === k ? 'var(--accent-soft)' : 'transparent', color: range === k ? '#FFFFFF' : 'var(--text-2)' }}>{l}</button>)}
        </div>
      </div>
      {!d ? <LoadState error={q.error} onRetry={q.reload} /> : (
        <>
          <div className="tiles">
            {([['Revenue', money(d.revenueCents), `Paid orders · ${label.toLowerCase()}`], ['New users', d.newUsers.toLocaleString('en-US'), `Signed up · ${label.toLowerCase()}`], ['Active VIP', d.activeVip.toLocaleString('en-US'), 'Paying now'], ['Episodes unlocked', d.unlocks.toLocaleString('en-US'), 'Coins and ads']] as const).map(([l, v, note]) => (
              <div key={l} className="tile"><span className="small muted">{l}</span><span className="v">{v}</span><span className="tiny faint">{note}</span></div>
            ))}
          </div>

          <section className="panel stack gap-12" aria-labelledby="rv">
            <div className="row between" style={{ flexWrap: 'wrap' }}>
              <h2 id="rv" style={{ margin: 0 }}>Revenue per day (USD), last 14 days</h2>
              <span className="small muted" aria-live="polite">{hover >= 0 ? `${fmtDate(d.revenue14[hover].day)} · ${money(d.revenue14[hover].cents)}` : 'Hover or tap a bar'}</span>
            </div>
            <div style={{ position: 'relative', height: 220, display: 'flex', alignItems: 'flex-end', gap: 2, borderBottom: '1px solid #3A3340', marginTop: 16 }}>
              <span aria-hidden="true" className="tiny faint" style={{ position: 'absolute', left: 0, top: -18 }}>{money(max)}</span>
              <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTop: '1px dashed var(--surface-2)' }} />
              <span aria-hidden="true" className="tiny faint" style={{ position: 'absolute', left: 0, top: 'calc(50% - 18px)' }}>{money(max / 2)}</span>
              <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed var(--surface-2)' }} />
              {d.revenue14.map((v, i) => (
                <button key={v.day} type="button" aria-label={`${fmtDate(v.day)}: ${money(v.cents)}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)} onClick={() => setHover(i)}
                  style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', background: 'none', border: 'none', padding: 0 }}>
                  <span style={{ width: '100%', height: `${(v.cents / max) * 100}%`, minHeight: v.cents ? 2 : 0, borderRadius: '4px 4px 0 0', background: hover === i ? '#FF8FA0' : '#FF5C7A' }} />
                </button>
              ))}
            </div>
            <div className="row between tiny faint"><span>{fmtDate(d.revenue14[0].day)}</span><span>{fmtDate(d.revenue14[6].day)}</span><span>{fmtDate(d.revenue14[13].day)}</span></div>
            <details>
              <summary className="small muted" style={{ cursor: 'pointer' }}>Show as table</summary>
              <table className="table" style={{ marginTop: 8 }}><thead><tr><th>Date</th><th>Revenue</th></tr></thead><tbody>{d.revenue14.map((v) => <tr key={v.day}><td>{fmtDate(v.day)}</td><td>{money(v.cents)}</td></tr>)}</tbody></table>
            </details>
          </section>

          <div className="two-col">
            <section className="panel main-col" style={{ gap: 0 }} aria-labelledby="na">
              <h2 id="na">Needs attention</h2>
              {d.attention.length === 0 && <span className="small faint" style={{ padding: '12px 0' }}>Nothing right now.</span>}
              {d.attention.map((a) => (
                <Link key={a.text} href={a.href} className="list-row" style={{ borderBottomColor: 'var(--surface-2)', fontSize: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: a.tone === 'warn' ? 'var(--warn)' : 'var(--accent)', flex: 'none' }} /><span className="grow">{a.text}</span><span className="small faint">{a.tag} ›</span>
                </Link>
              ))}
            </section>
            <section className="panel side-col" style={{ gap: 0 }} aria-labelledby="tp">
              <h2 id="tp">Top dramas this week</h2>
              {d.top.length === 0 && <span className="small faint" style={{ padding: '12px 0' }}>No unlocks this week yet.</span>}
              {d.top.map((t, i) => (
                <Link key={t.id} href={`/admin/dramas/${t.id}/`} className="list-row" style={{ borderBottomColor: 'var(--surface-2)', fontSize: 14 }}>
                  <span className="faint" style={{ width: 18, fontWeight: 700 }}>{i + 1}</span>
                  <span className="grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                  <span className="small muted">{t.unlocks.toLocaleString('en-US')} unlocks</span>
                </Link>
              ))}
            </section>
          </div>

          <section className="panel" style={{ gap: 0 }} aria-labelledby="hm">
            <h2 id="hm">Latest help messages</h2>
            {d.help.length === 0 && <span className="small faint" style={{ padding: '12px 0' }}>No messages yet.</span>}
            {d.help.map((h) => (
              <div key={h.id} className="stack gap-6" style={{ padding: '12px 0', borderTop: '1px solid var(--surface-2)' }}>
                <div className="row small" style={{ flexWrap: 'wrap', gap: 8 }}>
                  {h.userId ? <Link href={`/admin/users/${h.userId}/`} style={{ fontWeight: 700, color: '#FFFFFF', textDecoration: 'none' }}>{h.name}</Link> : <strong>{h.name}</strong>}
                  <span className="faint">{h.topic} · {fmtStamp(h.at)}</span>
                </div>
                <p style={{ margin: 0, lineHeight: 1.5, fontSize: 14, color: '#D7D0DA' }}>{h.message}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </AdminShell>
  )
}
