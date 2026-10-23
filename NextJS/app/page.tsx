'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell, HomeHeader, LoadState } from '@/components/shell'
import { FlameIcon, PlayIcon, Poster } from '@/components/ui'
import { useApi, useCatalog } from '@/lib/data'
import { useMe } from '@/lib/store'
import type { Drama, Home } from '@/lib/types'

function Banner({ items, hot }: { items: Drama[]; hot: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 5000)
    return () => clearInterval(t)
  }, [items.length])
  const hero = items[i % items.length]
  if (!hero) return null
  const rank = hot.indexOf(hero.id)
  const tag = hero.status === 'Scheduled' ? 'Coming soon' : rank >= 0 && rank < 10 ? `#${rank + 1} trending this week` : 'Featured'
  return (
    <section aria-label="Featured" className="pad">
      <Link href={`/drama/${hero.id}/`} style={{ display: 'block', position: 'relative', height: 'clamp(200px, 36vw, 400px)', borderRadius: 16, overflow: 'hidden', background: hero.color, color: '#FFFFFF', textDecoration: 'none' }}>
        {hero.banner
          ? <img src={hero.banner} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <>
            <div style={{ position: 'absolute', width: '70%', aspectRatio: '1', borderRadius: '50%', right: '-15%', top: '-40%', background: hero.color2 }} />
            <div style={{ position: 'absolute', width: '36%', aspectRatio: '1', borderRadius: '50%', right: '18%', top: '30%', background: hero.color2, opacity: .6 }} />
          </>}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, background: 'rgba(15,12,17,.55)', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div className="stack gap-6" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFC46B' }}>{tag}</div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{hero.title}</div>
            <div style={{ fontSize: 13, color: '#D7D0DA' }}>{[...hero.genres.slice(0, 2), hero.episodes ? `${hero.episodes} episodes` : ''].filter(Boolean).join(' · ')}</div>
          </div>
          <span className="btn btn-primary btn-sm" style={{ minHeight: 40 }}>{hero.status === 'Scheduled' ? 'Details' : <><PlayIcon size={14} />Play</>}</span>
        </div>
      </Link>
      {items.length > 1 && (
        <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 8 }} aria-hidden="true">
          {items.map((d, k) => <span key={d.id} style={{ width: k === i % items.length ? 16 : 6, height: 6, borderRadius: 3, background: k === i % items.length ? '#FF3D5E' : 'var(--surface-2)' }} />)}
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const cat = useCatalog()
  const home = useApi<Home>('/home')
  const { me } = useMe()

  if (!cat.ready || !home.data) {
    return <AppShell><HomeHeader /><LoadState error={cat.error ?? home.error} onRetry={() => { void cat.reload(); void home.reload() }} /></AppShell>
  }
  const h = home.data
  const continueList = Object.entries(me?.progress ?? {})
    .sort((a, b) => b[1].updated - a[1].updated)
    .map(([id, p]) => ({ drama: cat.get(id), ep: p.ep }))
    .filter((x): x is { drama: Drama; ep: number } => Boolean(x.drama) && x.drama!.status === 'Published')
  const trending = cat.pick(h.trending)
  const picks = cat.pick(h.picks)

  return (
    <AppShell>
      <HomeHeader />
      <div className="stack gap-24" style={{ paddingTop: 6 }}>
        <Banner items={cat.pick(h.banner)} hot={h.hot} />

        {continueList.length > 0 && (
          <section aria-labelledby="cw">
            <div className="section-head"><h2 id="cw">Continue watching</h2><Link href="/history/">See all</Link></div>
            <div className="hscroll">
              {continueList.map(({ drama, ep }) => (
                <Link key={drama.id} href={`/watch/${drama.id}/?ep=${ep}`} className="card-link">
                  <Poster drama={drama} progress={ep / Math.max(1, drama.episodes)} badge={false} />
                  <span className="card-title" style={{ WebkitLineClamp: 1 }}>{drama.title}</span>
                  <span className="card-sub">EP {ep} / {drama.episodes}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {trending.length > 0 && (
          <section aria-labelledby="tr">
            <div className="section-head"><h2 id="tr"><FlameIcon />Trending now</h2><Link href="/rankings/">Rankings</Link></div>
            <div className="hscroll">
              {trending.map((d, i) => (
                <Link key={d.id} href={`/drama/${d.id}/`} className="card-link">
                  <Poster drama={d} rank={i + 1} />
                  <span className="card-title">{d.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {picks.length > 0 && (
          <section aria-labelledby="pk">
            <div className="section-head"><h2 id="pk">Picked for you</h2></div>
            <div className="poster-grid">
              {picks.map((d) => (
                <Link key={d.id} href={`/drama/${d.id}/`} className="card-link">
                  <Poster drama={d} />
                  <span className="card-title">{d.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
