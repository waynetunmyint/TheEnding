'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, HomeHeader, LoadState } from '@/components/shell'
import { Poster } from '@/components/ui'
import { useApi, useCatalog, useConfig } from '@/lib/data'
import type { Rankings } from '@/lib/types'

const STATUS = ['All', 'Completed', 'Ongoing'] as const
const SORT = ['Popular', 'Newest', 'Most episodes'] as const

export default function GenresPage() {
  const [genre, setGenre] = useState('All')
  const [status, setStatus] = useState<(typeof STATUS)[number]>('All')
  const [sort, setSort] = useState<(typeof SORT)[number]>('Popular')
  const cat = useCatalog()
  const config = useConfig()
  const rk = useApi<Rankings>('/rankings')
  const hot = rk.data?.Hot ?? []
  const used = new Set(cat.published.flatMap((d) => d.genres))
  const genres = (config.data?.genres ?? []).filter((g) => used.has(g))
  const items = cat.published
    .filter((d) => genre === 'All' || d.genres.includes(genre))
    .filter((d) => status === 'All' || (status === 'Completed' ? d.completed : !d.completed))
    .sort((a, b) => (sort === 'Newest' ? b.releaseAt - a.releaseAt : sort === 'Most episodes' ? b.episodes - a.episodes : hot.indexOf(a.id) - hot.indexOf(b.id)))

  const group = (name: string, opts: readonly string[], value: string, set: (v: string) => void) => (
    <div role="radiogroup" aria-label={name} className="chips scroll pad">
      {opts.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className="chip soft" style={{ minHeight: 32, background: value === o ? undefined : 'transparent' }} onClick={() => set(o)}>{o}</button>
      ))}
    </div>
  )

  return (
    <AppShell>
      <HomeHeader />
      <div className="stack gap-8" style={{ padding: '6px 0 16px' }}>
        {group('Genre', ['All', ...genres], genre, setGenre)}
        {group('Status', STATUS, status, (v) => setStatus(v as (typeof STATUS)[number]))}
        {group('Sort', SORT, sort, (v) => setSort(v as (typeof SORT)[number]))}
      </div>
      {!cat.ready ? <LoadState error={cat.error} onRetry={cat.reload} /> : items.length === 0 ? (
        <div className="empty"><h2>Nothing here yet</h2><p>No {status === 'All' ? '' : `${status.toLowerCase()} `}{genre === 'All' ? '' : `${genre} `}dramas. Try another filter.</p></div>
      ) : (
        <div className="poster-grid">
          {items.map((d) => (
            <Link key={d.id} href={`/drama/${d.id}/`} className="card-link">
              <Poster drama={d} badge={false} />
              <span className="card-title">{d.title}</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
