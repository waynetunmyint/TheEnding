'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell, LoadState, TopBar, useRouteId, useToast } from '@/components/shell'
import { Icon, PlayIcon, Poster } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApi } from '@/lib/data'
import { fmtStamp } from '@/lib/format'
import { shareDrama } from '@/lib/share'
import { isUnlocked, toggleList, useMe } from '@/lib/store'
import type { Drama, Episode } from '@/lib/types'

export function DramaDetail() {
  const id = useRouteId(1)
  const q = useApi<{ drama: Drama; episodes: Episode[] }>(id && id !== '_' ? `/dramas/${encodeURIComponent(id)}` : null)
  const { me } = useMe()
  const [toast, show] = useToast()
  const [range, setRange] = useState(0)
  useEffect(() => { if (q.data) document.title = `${q.data.drama.title} · The Ending` }, [q.data])

  if (!q.data) {
    if (q.error?.status === 404) {
      return (
        <AppShell tabs={false}>
          <TopBar back="/" />
          <div className="empty"><h2>This drama isn&apos;t available</h2><p>It may have been removed or isn&apos;t out yet.</p><Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>Go to Home</Link></div>
        </AppShell>
      )
    }
    return <AppShell tabs={false}><TopBar back="/" /><LoadState error={q.error} onRetry={q.reload} /></AppShell>
  }

  const { drama: d, episodes } = q.data
  const ranges: [number, number][] = []
  for (let a = 0; a < episodes.length; a += 30) ranges.push([a, Math.min(a + 30, episodes.length)])
  const shown = episodes.slice(...(ranges[range] ?? [0, 0]))
  const current = me?.progress[d.id]?.ep
  const saved = me?.saved.includes(d.id) ?? false
  const upcoming = d.status !== 'Published'
  const reminded = me?.reminders.includes(d.id) ?? false
  const freeCount = episodes.filter((e) => e.free).length
  const toggle = (kind: 'saved' | 'reminders', msg: string) => toggleList(kind, d.id).then(() => show(msg), (e) => show(errorMessage(e)))

  return (
    <AppShell tabs={false}>
      <div style={{ position: 'relative' }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: d.color, overflow: 'hidden' }}>
          {d.banner
            ? <img src={d.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .6 }} />
            : <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', right: -120, top: -120, background: d.color2 }} />}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140, background: 'linear-gradient(rgba(15,12,17,0), #0F0C11)' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <TopBar back="/" right={<button type="button" className="icon-btn" aria-label="Share" onClick={() => shareDrama(d, show)}><Icon name="share" size={22} /></button>} />
        </div>
        <div className="row pad" style={{ position: 'relative', alignItems: 'flex-end', gap: 14, paddingTop: 12 }}>
          <div style={{ width: 120, flex: 'none' }}><Poster drama={d} showEps={false} /></div>
          <div className="stack gap-8" style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{d.title}</h1>
            <div className="small" style={{ color: '#D7D0DA' }}>
              {[d.totalEpisodes || d.episodes ? `${d.totalEpisodes || d.episodes} episodes` : '', d.completed ? 'Completed' : 'Ongoing', upcoming && d.releaseAt ? `Premieres ${fmtStamp(d.releaseAt)}` : ''].filter(Boolean).join(' · ')}
            </div>
            {d.genres.length > 0 && <div className="row" style={{ gap: 6, flexWrap: 'wrap', fontSize: 12 }}>{d.genres.map((g) => <span key={g} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,.12)' }}>{g}</span>)}</div>}
          </div>
        </div>
      </div>

      <div className="stack gap-16 pad" style={{ paddingTop: 18, maxWidth: 820 }}>
        {d.synopsis && <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)', lineHeight: 1.55 }}>{d.synopsis}</p>}
        {freeCount > 0 && (
          <div className="row small" style={{ gap: 8, color: '#FFC46B', fontWeight: 600 }}>
            <Icon name="gift" size={16} />{freeCount === episodes.length ? 'Every episode is free' : `${freeCount} free ${freeCount === 1 ? 'episode' : 'episodes'} · ${d.coinsPerEpisode} coins after · VIP watches all`}
          </div>
        )}

        {!upcoming && episodes.length > 0 && (
          <section aria-labelledby="ep" className="stack gap-12">
            <h2 id="ep" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Episodes</h2>
            {ranges.length > 1 && (
              <div role="tablist" aria-label="Episode range" className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
                {ranges.map(([a, b], i) => (
                  <button key={a} type="button" role="tab" aria-selected={range === i} onClick={() => setRange(i)} style={{ background: 'none', border: 'none', padding: '8px 0', fontWeight: 700, color: range === i ? '#FFFFFF' : 'var(--text-3)', boxShadow: range === i ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{episodes[a].n}–{episodes[b - 1].n}</button>
                ))}
              </div>
            )}
            <div className="ep-grid" style={{ maxWidth: 560 }}>
              {shown.map((e) => {
                const locked = !isUnlocked(me, d.id, e)
                return (
                  <Link key={e.n} href={`/watch/${d.id}/?ep=${e.n}`} aria-label={`Episode ${e.n}${locked ? ', locked' : ''}`}
                    className={`ep-cell${e.n === current ? ' current' : current && e.n < current ? ' watched' : ''}`}>
                    {e.n}
                    {locked && <span className="lock" style={{ color: 'var(--text-3)' }}><Icon name="lock" size={11} width={2.6} /></span>}
                  </Link>
                )
              })}
            </div>
          </section>
        )}
        {!upcoming && episodes.length === 0 && <p className="muted" style={{ margin: 0 }}>Episodes are on the way.</p>}
      </div>

      <div style={{ height: 96 }} />
      <div className="fixed-cta">
        <div className="row" style={{ maxWidth: 560, margin: '0 auto' }}>
          <button type="button" className="icon-btn" aria-label={saved ? 'Remove from My List' : 'Save to My List'} aria-pressed={saved} disabled={!me}
            style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--surface)', color: saved ? '#FFC46B' : '#FFFFFF' }}
            onClick={() => toggle('saved', saved ? 'Removed from My List' : 'Saved to My List')}>
            <Icon name="bookmark" size={22} fill={saved ? '#FFC46B' : 'none'} />
          </button>
          {upcoming ? (
            <button type="button" className={`btn btn-block ${reminded ? 'btn-secondary' : 'btn-primary'}`} aria-pressed={reminded} disabled={!me}
              onClick={() => toggle('reminders', reminded ? 'Reminder removed' : "We'll remind you on premiere day")}>
              {reminded ? 'Reminder set' : 'Remind me on premiere day'}
            </button>
          ) : episodes.length > 0 ? (
            <Link href={`/watch/${d.id}/?ep=${current ?? episodes[0].n}`} className="btn btn-primary btn-block"><PlayIcon />{current ? `Continue EP ${current}` : `Play EP ${episodes[0].n}`}</Link>
          ) : null}
        </div>
      </div>
      {toast}
    </AppShell>
  )
}
