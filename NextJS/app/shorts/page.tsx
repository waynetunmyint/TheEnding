'use client'

import Link from 'next/link'
import { AppShell, useToast } from '@/components/shell'
import { Icon } from '@/components/ui'
import { PUBLISHED, type Drama } from '@/data/dummy'
import { toggleIn, useDemo } from '@/lib/demo-store'
import { shareDrama } from '@/lib/share'

function Clip({ d }: { d: Drama }) {
  const s = useDemo()
  const [toast, show] = useToast()
  const liked = s.liked.includes(d.id)
  const saved = s.saved.includes(d.id)
  return (
    <section aria-label={`${d.title} trailer`} style={{ position: 'relative', height: '100%', scrollSnapAlign: 'start', overflow: 'hidden', background: d.color }}>
      <div style={{ position: 'absolute', width: '110%', aspectRatio: '1', borderRadius: '50%', left: '-15%', top: '18%', background: d.color2 }} />
      <div style={{ position: 'absolute', width: '56%', aspectRatio: '1', borderRadius: '50%', right: '-10%', top: '8%', background: d.color2, opacity: .7 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', background: 'rgba(0,0,0,.45)' }} />
      <span style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Trailer preview (demo)</span>

      <div style={{ position: 'absolute', right: 8, bottom: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Link href={`/drama/${d.id}/`} aria-label={`${d.title} details`} style={{ width: 46, height: 62, borderRadius: 8, border: '2px solid #FFFFFF', background: d.color2, display: 'block' }} />
        <button type="button" className="rail-btn" aria-pressed={liked} onClick={() => toggleIn('liked', d.id)}>
          <Icon name="heart" size={32} fill={liked ? '#FF3D5E' : 'none'} style={{ color: liked ? '#FF3D5E' : '#FFFFFF' }} />{liked ? 'Liked' : 'Like'}
        </button>
        <button type="button" className="rail-btn" aria-pressed={saved} onClick={() => { toggleIn('saved', d.id); show(saved ? 'Removed from My List' : 'Saved to My List') }}>
          <Icon name="bookmark" size={30} fill={saved ? '#FFC46B' : 'none'} style={{ color: saved ? '#FFC46B' : '#FFFFFF' }} />{saved ? 'Saved' : 'Save'}
        </button>
        <Link href={`/drama/${d.id}/`} className="rail-btn"><Icon name="grid" size={30} />Episodes</Link>
        <button type="button" className="rail-btn" onClick={() => shareDrama(d, show)}><Icon name="share" size={30} />Share</button>
      </div>

      <div style={{ position: 'absolute', left: 16, right: 84, bottom: 68, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{d.title}</div>
        <div style={{ fontSize: 14, color: '#E6E0E8', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.synopsis}</div>
        <div className="row" style={{ gap: 6, fontSize: 12 }}>{d.genres.slice(0, 2).map((g) => <span key={g} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,.16)' }}>{g}</span>)}</div>
      </div>
      <Link href={`/watch/${d.id}/?ep=1`} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 48, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: 'rgba(15,12,17,.92)', color: '#FFFFFF', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
        <Icon name="shorts" size={16} />
        <span style={{ flex: 1 }}>Watch full series · {d.episodes} episodes</span>
        <span style={{ color: '#FF5C7A', fontWeight: 700 }}>EP 1 ›</span>
      </Link>
      {toast}
    </section>
  )
}

export default function ShortsPage() {
  const order = ['alpha-king', 'contract-bride', 'hidden-heir', 'true-daughter', 'reborn-empire', 'night-market', 'divorced-ceo', 'rival-contract', 'runaway-bride']
  const items = order.map((id) => PUBLISHED.find((d) => d.id === id)).filter((d): d is Drama => Boolean(d))
  return (
    <AppShell flush>
      <h1 className="sr-only">Shorts</h1>
      <div className="fill-screen" style={{ maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
        {items.map((d) => <Clip key={d.id} d={d} />)}
      </div>
    </AppShell>
  )
}
