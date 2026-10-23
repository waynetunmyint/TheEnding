'use client'

import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'
import { AppShell, LoadState, TopBar } from '@/components/shell'
import { FlameIcon, Icon, Poster } from '@/components/ui'
import { useApi, useCatalog } from '@/lib/data'
import type { Home } from '@/lib/types'

const MEDAL = ['#FF5C7A', '#FF8A5C', '#FFC46B']
const RECENT_KEY = 'te-recent-searches'

// Recent searches are a per-browser convenience, kept in localStorage.
const noop = () => () => {}
function readRecent(): string | null {
  try {
    return window.localStorage.getItem(RECENT_KEY)
  } catch {
    return null
  }
}

function parseRecent(raw: string | null): string[] {
  try {
    const list = JSON.parse(raw ?? '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveRecent(list: string[]) {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* storage blocked */ }
}

export default function SearchPage() {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const stored = useSyncExternalStore(noop, readRecent, () => null)
  const [edited, setRecent] = useState<string[] | null>(null)
  const recent = edited ?? parseRecent(stored)
  const cat = useCatalog()
  const trending = useApi<string[]>('/search/trending')
  const home = useApi<Home>('/home')
  const search = useApi<{ results: string[] }>(query ? `/search?q=${encodeURIComponent(query)}` : null)

  const run = (q: string) => {
    const v = q.trim()
    setText(v)
    setQuery(v)
    if (v) {
      const next = [v, ...recent.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8)
      setRecent(next)
      saveRecent(next)
    }
  }
  const results = search.data ? cat.pick(search.data.results) : []

  return (
    <AppShell tabs={false}>
      <TopBar back="/">
        <form className="row" style={{ flex: 1, gap: 4 }} role="search" onSubmit={(e) => { e.preventDefault(); run(text) }}>
          <label className="search-pill">
            <Icon name="search" size={18} width={2.2} />
            <input type="search" aria-label="Search dramas" placeholder="Search dramas, genres" value={text} onChange={(e) => { setText(e.target.value); if (!e.target.value) setQuery('') }} />
          </label>
          <button type="submit" className="btn btn-ghost btn-sm" style={{ color: 'var(--text)' }}>Search</button>
        </form>
      </TopBar>

      {!query && (
        <div className="stack gap-24 pad narrow" style={{ paddingTop: 20, margin: 0, maxWidth: 760 }}>
          {recent.length > 0 && (
            <section aria-labelledby="rc">
              <div className="row between"><h2 id="rc" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Recent</h2>
                <button type="button" className="icon-btn" aria-label="Clear recent searches" onClick={() => { setRecent([]); saveRecent([]) }} style={{ color: 'var(--text-3)' }}><Icon name="trash" size={18} /></button></div>
              <div className="chips">{recent.map((r) => <button key={r} type="button" className="chip" onClick={() => run(r)}>{r}</button>)}</div>
            </section>
          )}
          {(trending.data?.length ?? 0) > 0 && (
            <section aria-labelledby="ts">
              <h2 id="ts" style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><FlameIcon size={16} />Trending searches</h2>
              <ol className="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16 }}>
                {trending.data!.map((q, i) => (
                  <li key={q}><button type="button" className="list-row" style={{ minHeight: 44, borderBottom: 'none', fontSize: 14 }} onClick={() => run(q)}>
                    <span style={{ width: 16, fontWeight: 900, fontStyle: 'italic', color: MEDAL[i] ?? 'var(--text-3)' }}>{i + 1}</span>
                    <span className="grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q}</span>
                  </button></li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {query && (!search.data || !cat.ready) && <LoadState error={search.error ?? cat.error} onRetry={search.reload} />}

      {query && search.data && results.length > 0 && (
        <div className="pad" style={{ maxWidth: 760 }}>
          <p className="small faint" style={{ margin: '16px 0 4px' }}>{results.length} {results.length === 1 ? 'drama' : 'dramas'}</p>
          <ul className="list">
            {results.map((d) => (
              <li key={d.id} className="row" style={{ alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--surface)' }}>
                <Link href={`/drama/${d.id}/`} style={{ width: 84, flex: 'none' }} aria-label={d.title}><Poster drama={d} showEps={false} badge={false} /></Link>
                <Link href={`/drama/${d.id}/`} className="stack gap-6" style={{ flex: 1, minWidth: 0, color: 'var(--text)', textDecoration: 'none' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</span>
                  <span className="tiny faint">{[...d.genres.slice(0, 2), `${d.episodes} EP`].join(' · ')}</span>
                  {d.synopsis && <span className="small muted" style={{ lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.synopsis}</span>}
                </Link>
                <Link href={`/watch/${d.id}/`} className="btn btn-primary btn-sm" style={{ alignSelf: 'center' }}>Watch</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {query && search.data && cat.ready && results.length === 0 && (
        <>
          <div className="empty" style={{ paddingBottom: 32 }}>
            <div className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}><Icon name="search" size={30} /></div>
            <h2>No dramas found</h2>
            <p>Try a shorter title or a genre like Romance.</p>
          </div>
          {home.data && (
            <section aria-labelledby="yl">
              <div className="section-head"><h2 id="yl">You might like</h2></div>
              <div className="poster-grid">
                {cat.pick(home.data.hot.slice(0, 3)).map((d) => (
                  <Link key={d.id} href={`/drama/${d.id}/`} className="card-link"><Poster drama={d} /><span className="card-title">{d.title}</span></Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  )
}
