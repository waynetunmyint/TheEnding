'use client'

import { useState } from 'react'
import { AdminShell, RoleNote, useAdmin } from '@/components/admin-shell'
import { LoadState, useToast } from '@/components/shell'
import { Icon } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { invalidate, setData, useApi } from '@/lib/data'
import type { AdminDrama, Slot } from '@/lib/types'

type Sections = Record<'banner' | 'trending' | 'soon', Slot[]>
const META: { key: keyof Sections; name: string; hint: string; wide: boolean }[] = [
  { key: 'banner', name: 'Banner', hint: 'Up to 5 · rotates every 5s', wide: true },
  { key: 'trending', name: 'Trending now', hint: 'Automatic by plays and unlocks · pinned items stay on top', wide: false },
  { key: 'soon', name: 'Coming soon', hint: 'Scheduled dramas; viewers can tap Remind me', wide: false },
]

function Editor({ initial, dramas }: { initial: Sections; dramas: AdminDrama[] }) {
  const admin = useAdmin()
  const can = admin.can('content')
  const [sections, setSections] = useState(initial)
  const [dirty, setDirty] = useState(0)
  const [adding, setAdding] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()
  const byId = new Map(dramas.map((d) => [d.id, d]))
  const change = (key: keyof Sections, fn: (items: Slot[]) => Slot[]) => {
    setSections((ss) => ({ ...ss, [key]: fn(ss[key]) }))
    setDirty((n) => n + 1)
  }
  const move = (key: keyof Sections, i: number, dir: -1 | 1) => change(key, (items) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return items
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]]
    return next
  })
  const publish = async () => {
    setBusy(true)
    try {
      const saved = await api<Sections>('/admin/home', { method: 'PUT', body: sections })
      setData('/admin/home', saved)
      invalidate('/home')
      setDirty(0)
      show('Published to Home')
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const options = (key: keyof Sections) => dramas.filter((d) => (key === 'soon' ? d.status === 'Scheduled' : key === 'trending' ? d.status === 'Published' : d.status !== 'Draft'))

  return (
    <>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <div className="stack gap-6" style={{ flex: 1 }}>
          <h1>Home curation</h1>
          <span className="small faint">What viewers see on Home. {dirty ? `${dirty} unpublished ${dirty === 1 ? 'change' : 'changes'}.` : 'Everything is published.'}</span>
        </div>
        {can && <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} disabled={!dirty || busy} onClick={publish}>Publish changes</button>}
      </div>
      <RoleNote perm="content" admin={admin} />
      {META.map((s) => {
        const items = sections[s.key]
        return (
          <section key={s.key} className="panel stack" aria-labelledby={`h-${s.key}`}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <h2 id={`h-${s.key}`} style={{ margin: 0, flex: 1 }}>{s.name}</h2>
              <span className="small faint">{s.hint}</span>
              {can && (adding === s.key ? (
                <select aria-label={`Add drama to ${s.name}`} className="input" style={{ width: 'auto', minHeight: 34 }} autoFocus defaultValue=""
                  onBlur={() => setAdding('')}
                  onChange={(e) => { const id = e.target.value; if (id) change(s.key, (xs) => [...xs, { dramaId: id, meta: '' }]); setAdding('') }}>
                  <option value="" disabled>Choose a drama…</option>
                  {options(s.key).filter((d) => !items.some((i) => i.dramaId === d.id)).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" disabled={s.key === 'banner' && items.length >= 5} onClick={() => setAdding(s.key)}>+ Add drama</button>
              ))}
            </div>
            <ol className="list" style={{ marginTop: 6 }}>
              {items.length === 0 && <li className="small faint" style={{ padding: '12px 0' }}>Empty. {s.key === 'trending' ? 'Trending fills automatically.' : s.key === 'soon' ? 'Scheduled dramas still show automatically.' : 'Home shows the top trending drama.'}</li>}
              {items.map((slot, i) => {
                const d = byId.get(slot.dramaId)
                const title = d?.title ?? slot.dramaId
                return (
                  <li key={slot.dramaId} className="row" style={{ minHeight: 64, borderTop: '1px solid var(--surface-2)' }}>
                    {can && (
                      <span className="stack" style={{ gap: 0 }}>
                        <button type="button" className="icon-btn" style={{ width: 32, height: 26 }} aria-label={`Move ${title} up`} disabled={i === 0} onClick={() => move(s.key, i, -1)}><Icon name="chevronUp" size={16} width={2.4} /></button>
                        <button type="button" className="icon-btn" style={{ width: 32, height: 26 }} aria-label={`Move ${title} down`} disabled={i === items.length - 1} onClick={() => move(s.key, i, 1)}><Icon name="chevronDown" size={16} width={2.4} /></button>
                      </span>
                    )}
                    <span className="faint" style={{ width: 18, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ width: s.wide ? 78 : 33, height: 44, borderRadius: 6, background: d?.[s.wide ? 'banner' : 'poster'] ? `center / cover url(${d[s.wide ? 'banner' : 'poster']})` : d?.color ?? 'var(--surface-2)', flex: 'none' }} />
                    <span className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
                      <input className="input" aria-label={`Note for ${title}`} placeholder="Note (optional), e.g. Pinned until Friday" value={slot.meta} maxLength={60} disabled={!can}
                        onChange={(e) => change(s.key, (xs) => xs.map((x, k) => (k === i ? { ...x, meta: e.target.value } : x)))}
                        style={{ minHeight: 30, fontSize: 12, padding: '0 8px', background: 'transparent', borderColor: 'transparent', color: 'var(--text-3)' }} />
                    </span>
                    {can && <button type="button" className="icon-btn" aria-label={`Remove ${title}`} style={{ color: 'var(--text-3)' }} onClick={() => change(s.key, (xs) => xs.filter((_, k) => k !== i))}><Icon name="close" size={16} width={2.2} /></button>}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
      {toast}
    </>
  )
}

export default function AdminHomeCuration() {
  const home = useApi<Sections>('/admin/home')
  const dramas = useApi<AdminDrama[]>('/admin/dramas')
  return (
    <AdminShell>
      {!home.data || !dramas.data ? <LoadState error={home.error ?? dramas.error} onRetry={() => { void home.reload(); void dramas.reload() }} /> : <Editor initial={home.data} dramas={dramas.data} />}
    </AdminShell>
  )
}
