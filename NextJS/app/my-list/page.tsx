'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ListTabs } from '@/components/list-tabs'
import { AppShell, useHydrated } from '@/components/shell'
import { Icon, Poster } from '@/components/ui'
import { getDrama, type Drama } from '@/data/dummy'
import { toggleIn, useDemo } from '@/lib/demo-store'

export default function MyListPage() {
  const s = useDemo()
  const hydrated = useHydrated()
  const [editing, setEditing] = useState(false)
  const items = s.saved.map((id) => getDrama(id)).filter((d): d is Drama => Boolean(d))
  return (
    <AppShell>
      <header className="stack gap-12 pad" style={{ paddingTop: 16 }}>
        <div className="row between" style={{ minHeight: 44 }}>
          <h1 className="page-title">My List</h1>
          {items.length > 0 && <button type="button" className="btn btn-ghost btn-sm" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</button>}
        </div>
        <ListTabs current="saved" />
      </header>
      {hydrated && items.length === 0 && (
        <div className="empty">
          <div className="icon-circle"><Icon name="bookmark" size={30} /></div>
          <h2>Nothing saved yet</h2>
          <p>Tap Save on any drama and it lands here, with a note when new episodes drop.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>Find something to watch</Link>
        </div>
      )}
      {hydrated && items.length > 0 && (
        <div className="poster-grid" style={{ paddingTop: 16 }}>
          {items.map((d) => {
            const at = s.progress[d.id]?.ep ?? 0
            return (
              <div key={d.id} style={{ position: 'relative' }}>
                <Link href={at ? `/watch/${d.id}/?ep=${at}` : `/drama/${d.id}/`} className="card-link">
                  <Poster drama={d} progress={at / d.episodes} badge={false} />
                  <span className="card-title">{d.title}</span>
                  <span className="card-sub">{at ? `EP ${at} / ${d.episodes}` : 'Not started'}</span>
                </Link>
                {editing && (
                  <button type="button" className="icon-btn" aria-label={`Remove ${d.title}`} onClick={() => toggleIn('saved', d.id)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 36, height: 36, background: 'rgba(15,12,17,.8)' }}><Icon name="close" size={16} width={2.4} /></button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
