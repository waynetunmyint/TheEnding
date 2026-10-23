'use client'

import Link from 'next/link'
import { ListTabs } from '@/components/list-tabs'
import { AppShell, LoadState, useToast } from '@/components/shell'
import { Icon, Poster } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCatalog } from '@/lib/data'
import { clearHistory, useMe } from '@/lib/store'
import type { Drama } from '@/lib/types'

export default function HistoryPage() {
  const { me, error } = useMe()
  const cat = useCatalog()
  const [toast, show] = useToast()
  const ready = me && cat.ready
  const rows = Object.entries(me?.progress ?? {})
    .sort((a, b) => b[1].updated - a[1].updated)
    .map(([id, p]) => ({ d: cat.get(id), ep: p.ep }))
    .filter((r): r is { d: Drama; ep: number } => Boolean(r.d))
  return (
    <AppShell>
      <header className="stack gap-12 pad" style={{ paddingTop: 16 }}>
        <div className="row between" style={{ minHeight: 44 }}>
          <h1 className="page-title">My List</h1>
          {rows.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => clearHistory().catch((e) => show(errorMessage(e)))}>Clear</button>}
        </div>
        <ListTabs current="history" />
      </header>
      {!ready && <LoadState error={error || cat.error} onRetry={cat.reload} />}
      {ready && rows.length === 0 && (
        <div className="empty">
          <div className="icon-circle"><Icon name="shorts" size={30} /></div>
          <h2>No history yet</h2>
          <p>Dramas you start watching show up here so you can jump back in.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>Start watching</Link>
        </div>
      )}
      {ready && rows.length > 0 && (
        <ul className="list pad" style={{ paddingTop: 8, maxWidth: 760 }}>
          {rows.map(({ d, ep }) => {
            const done = ep >= d.episodes && d.completed
            return (
              <li key={d.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--surface)' }}>
                <Link href={`/drama/${d.id}/`} style={{ width: 60, flex: 'none' }} aria-label={d.title}><Poster drama={d} showEps={false} badge={false} /></Link>
                <div className="stack gap-6" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                  <span className="small faint">EP {ep} of {d.episodes}</span>
                  <div className="bar" style={{ width: 120 }}><span style={{ width: `${Math.min(100, Math.round((ep / Math.max(1, d.episodes)) * 100))}%`, background: '#FF3D5E' }} /></div>
                </div>
                <Link href={`/watch/${d.id}/?ep=${done ? 1 : ep}`} className="btn btn-soft btn-sm">{done ? 'Rewatch' : 'Continue'}</Link>
              </li>
            )
          })}
        </ul>
      )}
      {toast}
    </AppShell>
  )
}
