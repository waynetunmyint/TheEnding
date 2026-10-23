'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { Avatar } from '@/components/ui'
import { REPORTED_COMMENTS } from '@/data/dummy'

type Item = (typeof REPORTED_COMMENTS)[number] & { state: 'Reported' | 'Kept' | 'Hidden' }
const TABS = ['Reported', 'Kept', 'Hidden'] as const

export default function AdminComments() {
  const [toast, show] = useToast()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Reported')
  const [items, setItems] = useState<Item[]>(REPORTED_COMMENTS.map((c) => ({ ...c, state: 'Reported' })))
  const act = (id: string, state: Item['state'], msg: string) => { setItems((xs) => xs.map((x) => x.id === id ? { ...x, state } : x)); show(msg) }
  const shown = items.filter((i) => i.state === tab)
  return (
    <AdminShell>
      <h1>Comments</h1>
      <nav aria-label="Comment queues" className="row" style={{ gap: 22, borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => {
          const n = items.filter((i) => i.state === t).length
          return <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} style={{ minHeight: 40, background: 'none', border: 'none', padding: 0, fontWeight: 700, color: tab === t ? '#FFFFFF' : 'var(--text-3)', boxShadow: tab === t ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{t} ({n})</button>
        })}
      </nav>
      {shown.length === 0 && <div className="empty panel"><h2>{tab === 'Reported' ? 'Queue is clear' : `Nothing ${tab.toLowerCase()}`}</h2><p>{tab === 'Reported' ? 'New reports from viewers show up here.' : 'Decisions you make show up here.'}</p></div>}
      <ul className="list stack gap-12" style={{ maxWidth: 900 }}>
        {shown.map((c) => (
          <li key={c.id} className="panel stack gap-12">
            <div className="row small" style={{ flexWrap: 'wrap', gap: 10 }}>
              <Avatar initial={c.initial} color={c.color} size={28} />
              <Link href={`/admin/users/${c.userId}/`} style={{ color: '#FFFFFF', fontWeight: 700, textDecoration: 'none' }}>{c.name}</Link>
              <span className="faint">on {c.where} · {c.when}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--bad)', fontWeight: 700 }}>{c.reports}</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{c.text}</p>
            {c.state === 'Reported' ? (
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => act(c.id, 'Kept', 'Comment kept')}>Keep</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => act(c.id, 'Hidden', 'Comment hidden')}>Hide comment</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => act(c.id, 'Hidden', `Hidden · ${c.name} muted for 7 days`)}>Hide &amp; mute user 7 days</button>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => act(c.id, 'Reported', 'Moved back to the queue')}>Undo</button>
            )}
          </li>
        ))}
      </ul>
      {toast}
    </AdminShell>
  )
}
