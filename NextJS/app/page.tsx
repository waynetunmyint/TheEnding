'use client'

import Link from 'next/link'
import { AppShell, HomeHeader } from '@/components/shell'
import { FlameIcon, PlayIcon, Poster } from '@/components/ui'
import { PUBLISHED, RANKINGS, getDrama, type Drama } from '@/data/dummy'
import { useDemo } from '@/lib/demo-store'

export default function HomePage() {
  const s = useDemo()
  const hero = getDrama('contract-bride')!
  const continueList = Object.entries(s.progress)
    .sort((a, b) => b[1].updated - a[1].updated)
    .map(([id, p]) => ({ drama: getDrama(id), ep: p.ep }))
    .filter((x): x is { drama: Drama; ep: number } => Boolean(x.drama))
  const trending = RANKINGS.Hot.slice(0, 8).map((id) => getDrama(id)!)
  const picks = PUBLISHED.filter((d) => !RANKINGS.Hot.slice(0, 3).includes(d.id))

  return (
    <AppShell>
      <HomeHeader />
      <div className="stack gap-24" style={{ paddingTop: 6 }}>
        <section aria-label="Featured" className="pad">
          <Link href={`/drama/${hero.id}/`} style={{ display: 'block', position: 'relative', height: 'clamp(200px, 36vw, 400px)', borderRadius: 16, overflow: 'hidden', background: hero.color, color: '#FFFFFF', textDecoration: 'none' }}>
            <div style={{ position: 'absolute', width: '70%', aspectRatio: '1', borderRadius: '50%', right: '-15%', top: '-40%', background: hero.color2 }} />
            <div style={{ position: 'absolute', width: '36%', aspectRatio: '1', borderRadius: '50%', right: '18%', top: '30%', background: '#6A2C3D' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, background: 'rgba(15,12,17,.55)', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <div className="stack gap-6" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FFC46B' }}>#1 in Romance this week</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{hero.title}</div>
                <div style={{ fontSize: 13, color: '#D7D0DA' }}>{hero.genres.slice(0, 2).join(' · ')} · {hero.episodes} episodes</div>
              </div>
              <span className="btn btn-primary btn-sm" style={{ minHeight: 40 }}><PlayIcon size={14} />Play</span>
            </div>
          </Link>
        </section>

        {continueList.length > 0 && (
          <section aria-labelledby="cw">
            <div className="section-head"><h2 id="cw">Continue watching</h2><Link href="/history/">See all</Link></div>
            <div className="hscroll">
              {continueList.map(({ drama, ep }) => (
                <Link key={drama.id} href={`/watch/${drama.id}/?ep=${ep}`} className="card-link">
                  <Poster drama={drama} progress={ep / drama.episodes} badge={false} />
                  <span className="card-title" style={{ WebkitLineClamp: 1 }}>{drama.title}</span>
                  <span className="card-sub">EP {ep} / {drama.episodes}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

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
      </div>
    </AppShell>
  )
}
