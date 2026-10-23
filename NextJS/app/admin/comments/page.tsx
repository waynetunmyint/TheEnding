'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell, EmptyPanel, RoleNote, useAdmin } from '@/components/admin-shell'
import { LoadState, useToast } from '@/components/shell'
import { Avatar } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { invalidate, useApi } from '@/lib/data'
import { fmtStamp } from '@/lib/format'

type Item = { id: number; userId: number; name: string; initial: string; color: string; dramaId: string; dramaTitle: string; ep: number; text: string; reports: number; reasons: string; at: number; state: string }
const TABS = ['Reported', 'Kept', 'Hidden'] as const

export default function AdminComments() {
  const admin = useAdmin()
  const [toast, show] = useToast()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Reported')
  const q = useApi<{ comments: Item[]; counts: Record<string, number> }>(`/admin/comments?state=${tab}`)
  const can = admin.can('comments')
  const act = async (c: Item, action: string, msg: string) => {
    try {
      await api(`/admin/comments/${c.id}`, { method: 'POST', body: { action } })
      invalidate('/admin/comments')
      invalidate('/admin/me')
      show(msg)
    } catch (e) {
      show(errorMessage(e))
    }
  }
  return (
    <AdminShell>
      <h1>Comments</h1>
      <nav aria-label="Comment queues" className="row" style={{ gap: 22, borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => (
          <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} style={{ minHeight: 40, background: 'none', border: 'none', padding: 0, fontWeight: 700, color: tab === t ? '#FFFFFF' : 'var(--text-3)', boxShadow: tab === t ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>
            {t}{q.data ? ` (${q.data.counts[t] ?? 0})` : ''}
          </button>
        ))}
      </nav>
      <RoleNote perm="comments" admin={admin} />
      {!q.data ? <LoadState error={q.error} onRetry={q.reload} /> : q.data.comments.length === 0 ? (
        <EmptyPanel title={tab === 'Reported' ? 'Queue is clear' : `Nothing ${tab.toLowerCase()}`} body={tab === 'Reported' ? 'New reports from viewers show up here.' : 'Decisions you make show up here.'} icon="comment" />
      ) : (
        <ul className="list stack gap-12" style={{ maxWidth: 900 }}>
          {q.data.comments.map((c) => (
            <li key={c.id} className="panel stack gap-12">
              <div className="row small" style={{ flexWrap: 'wrap', gap: 10 }}>
                <Avatar initial={c.initial} color={c.color} size={28} />
                <Link href={`/admin/users/${c.userId}/`} style={{ color: '#FFFFFF', fontWeight: 700, textDecoration: 'none' }}>{c.name}</Link>
                <span className="faint">on <Link href={`/watch/${c.dramaId}/?ep=${c.ep}`}>{c.dramaTitle} · EP {c.ep}</Link> · {fmtStamp(c.at)}</span>
                {c.reports > 0 && <span style={{ marginLeft: 'auto', color: 'var(--bad)', fontWeight: 700 }}>{c.reports} {c.reports === 1 ? 'report' : 'reports'}{c.reasons ? ` · ${c.reasons}` : ''}</span>}
              </div>
              <p style={{ margin: 0, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{c.text}</p>
              {can && (c.state === 'Reported' ? (
                <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => act(c, 'keep', 'Comment kept')}>Keep</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(c, 'hide', 'Comment hidden')}>Hide comment</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => act(c, 'mute', `Hidden · ${c.name} muted for 7 days`)}>Hide &amp; mute user 7 days</button>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => act(c, 'restore', c.reports ? 'Moved back to the queue' : 'Comment visible again')}>Undo</button>
              ))}
            </li>
          ))}
        </ul>
      )}
      {toast}
    </AdminShell>
  )
}
