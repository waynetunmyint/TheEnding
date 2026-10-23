'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, TopBar, useToast } from '@/components/shell'
import { Icon, PlayIcon, Poster } from '@/components/ui'
import { getDrama } from '@/data/dummy'
import { isUnlocked, toggleIn, useDemo } from '@/lib/demo-store'
import { shareDrama } from '@/lib/share'

export function DramaDetail({ id }: { id: string }) {
  const d = getDrama(id)!
  const s = useDemo()
  const [toast, show] = useToast()
  const ranges: [number, number][] = []
  for (let a = 1; a <= d.episodes; a += 30) ranges.push([a, Math.min(a + 29, d.episodes)])
  const [range, setRange] = useState(0)
  const current = s.progress[d.id]?.ep
  const saved = s.saved.includes(d.id)
  const upcoming = d.status !== 'Published'
  const reminded = s.reminders.includes(d.id)

  const eps: number[] = []
  for (let n = ranges[range][0]; n <= ranges[range][1]; n++) eps.push(n)

  return (
    <AppShell tabs={false}>
      <div style={{ position: 'relative' }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: d.color, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', right: -120, top: -120, background: d.color2 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140, background: 'linear-gradient(rgba(15,12,17,0), #0F0C11)' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <TopBar back="/" right={<button type="button" className="icon-btn" aria-label="Share" onClick={() => shareDrama(d, show)}><Icon name="share" size={22} /></button>} />
        </div>
        <div className="row pad" style={{ position: 'relative', alignItems: 'flex-end', gap: 14, paddingTop: 12 }}>
          <div style={{ width: 120, flex: 'none' }}><Poster drama={d} showEps={false} /></div>
          <div className="stack gap-8" style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{d.title}</h1>
            <div className="small" style={{ color: '#D7D0DA' }}>{d.episodes} episodes · {d.completed ? 'Completed' : 'Ongoing'}{upcoming ? ` · Premieres ${d.releaseDate}` : ''}</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', fontSize: 12 }}>{d.genres.map((g) => <span key={g} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,.12)' }}>{g}</span>)}</div>
          </div>
        </div>
      </div>

      <div className="stack gap-16 pad" style={{ paddingTop: 18, maxWidth: 820 }}>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)', lineHeight: 1.55 }}>{d.synopsis}</p>
        <div className="row small" style={{ gap: 8, color: '#FFC46B', fontWeight: 600 }}>
          <Icon name="gift" size={16} />Episodes 1–{d.freeEpisodes} are free · VIP watches all
        </div>

        {!upcoming && (
          <section aria-labelledby="ep" className="stack gap-12">
            <h2 id="ep" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Episodes</h2>
            {ranges.length > 1 && (
              <div role="tablist" aria-label="Episode range" className="row" style={{ gap: 18 }}>
                {ranges.map(([a, b], i) => (
                  <button key={a} type="button" role="tab" aria-selected={range === i} onClick={() => setRange(i)} style={{ background: 'none', border: 'none', padding: '8px 0', fontWeight: 700, color: range === i ? '#FFFFFF' : 'var(--text-3)', boxShadow: range === i ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{a}–{b}</button>
                ))}
              </div>
            )}
            <div className="ep-grid" style={{ maxWidth: 560 }}>
              {eps.map((n) => {
                const locked = !isUnlocked(s, d.id, n)
                return (
                  <Link key={n} href={`/watch/${d.id}/?ep=${n}`} aria-label={`Episode ${n}${locked ? ', locked' : ''}`}
                    className={`ep-cell${n === current ? ' current' : current && n < current ? ' watched' : ''}`}>
                    {n}
                    {locked && <span className="lock" style={{ color: 'var(--text-3)' }}><Icon name="lock" size={11} width={2.6} /></span>}
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <div style={{ height: 96 }} />
      <div className="fixed-cta">
        <div className="row" style={{ maxWidth: 560, margin: '0 auto' }}>
          <button type="button" className="icon-btn" aria-label={saved ? 'Remove from My List' : 'Save to My List'} aria-pressed={saved}
            style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--surface)', color: saved ? '#FFC46B' : '#FFFFFF' }}
            onClick={() => { toggleIn('saved', d.id); show(saved ? 'Removed from My List' : 'Saved to My List') }}>
            <Icon name="bookmark" size={22} fill={saved ? '#FFC46B' : 'none'} />
          </button>
          {upcoming ? (
            <button type="button" className={`btn btn-block ${reminded ? 'btn-secondary' : 'btn-primary'}`} aria-pressed={reminded} onClick={() => toggleIn('reminders', d.id)}>
              {reminded ? 'Reminder set' : `Remind me on ${d.releaseDate}`}
            </button>
          ) : (
            <Link href={`/watch/${d.id}/?ep=${current ?? 1}`} className="btn btn-primary btn-block"><PlayIcon />{current ? `Continue EP ${current}` : 'Play EP 1'}</Link>
          )}
        </div>
      </div>
      {toast}
    </AppShell>
  )
}
