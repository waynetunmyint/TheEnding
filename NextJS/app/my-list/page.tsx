'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ListTabs } from '@/components/list-tabs'
import { AppShell, LoadState, useToast } from '@/components/shell'
import { Icon, Poster } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCatalog } from '@/lib/data'
import { toggleList, useMe } from '@/lib/store'

export default function MyListPage() {
  const { me, error } = useMe()
  const cat = useCatalog()
  const [toast, show] = useToast()
  const [editing, setEditing] = useState(false)
  const items = me ? cat.pick(me.saved) : []
  const ready = me && cat.ready
  return (
    <AppShell>
      <header className="stack gap-12 pad" style={{ paddingTop: 16 }}>
        <div className="row between" style={{ minHeight: 44 }}>
          <h1 className="page-title">My List</h1>
          {items.length > 0 && <button type="button" className="btn btn-ghost btn-sm" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</button>}
        </div>
        <ListTabs current="saved" />
      </header>
      {!ready && <LoadState error={error || cat.error} onRetry={cat.reload} />}
      {ready && items.length === 0 && (
        <div className="empty">
          <div className="icon-circle"><Icon name="bookmark" size={30} /></div>
          <h2>Nothing saved yet</h2>
          <p>Tap Save on any drama and it lands here, with a note when new episodes drop.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>Find something to watch</Link>
        </div>
      )}
      {ready && items.length > 0 && (
        <div className="poster-grid" style={{ paddingTop: 16 }}>
          {items.map((d) => {
            const at = me.progress[d.id]?.ep ?? 0
            return (
              <div key={d.id} style={{ position: 'relative' }}>
                <Link href={at && d.status === 'Published' ? `/watch/${d.id}/?ep=${at}` : `/drama/${d.id}/`} className="card-link">
                  <Poster drama={d} progress={at / Math.max(1, d.episodes)} badge={false} />
                  <span className="card-title">{d.title}</span>
                  <span className="card-sub">{d.status === 'Scheduled' ? 'Coming soon' : at ? `EP ${at} / ${d.episodes}` : 'Not started'}</span>
                </Link>
                {editing && (
                  <button type="button" className="icon-btn" aria-label={`Remove ${d.title}`} onClick={() => toggleList('saved', d.id).catch((e) => show(errorMessage(e)))}
                    style={{ position: 'absolute', top: 4, right: 4, width: 36, height: 36, background: 'rgba(15,12,17,.8)' }}><Icon name="close" size={16} width={2.4} /></button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {toast}
    </AppShell>
  )
}
