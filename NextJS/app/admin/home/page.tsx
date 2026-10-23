'use client'

import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { Icon } from '@/components/ui'
import { PUBLISHED, getDrama, type Drama } from '@/data/dummy'

type Slot = { id: string; meta: string }
type Section = { key: string; name: string; hint: string; wide: boolean; items: Slot[] }

const INITIAL: Section[] = [
  { key: 'banner', name: 'Banner', hint: 'Up to 5 · rotates every 5s', wide: true, items: [
    { id: 'contract-bride', meta: 'Shows 20/10/2026 – 31/10/2026' }, { id: 'duke-maid', meta: 'Starts 25/10/2026 · premiere' }, { id: 'divorced-ceo', meta: 'Always on' },
  ] },
  { key: 'trending', name: 'Trending now', hint: 'Automatic by unlocks · pinned items stay on top', wide: false, items: [
    { id: 'reborn-empire', meta: 'Pinned' }, { id: 'hidden-heir', meta: 'Pinned until 27/10/2026' },
  ] },
  { key: 'soon', name: 'Coming soon', hint: 'Viewers can tap Remind me', wide: false, items: [
    { id: 'duke-maid', meta: 'Premieres 25/10/2026 · 8:00 PM' }, { id: 'ex-husband', meta: 'Premieres 28/10/2026 · 8:00 PM' },
  ] },
]

export default function AdminHomeCuration() {
  const [sections, setSections] = useState(INITIAL)
  const [dirty, setDirty] = useState(0)
  const [adding, setAdding] = useState('')
  const [toast, show] = useToast()
  const change = (key: string, fn: (items: Slot[]) => Slot[]) => {
    setSections((ss) => ss.map((s) => s.key === key ? { ...s, items: fn(s.items) } : s))
    setDirty((n) => n + 1)
  }
  const move = (key: string, i: number, dir: -1 | 1) => change(key, (items) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return items
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]]
    return next
  })

  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <div className="stack gap-6" style={{ flex: 1 }}>
          <h1>Home curation</h1>
          <span className="small faint">What viewers see on the app and web Home. {dirty ? `${dirty} unpublished ${dirty === 1 ? 'change' : 'changes'}.` : 'Everything is published.'}</span>
        </div>
        <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} disabled={!dirty} onClick={() => { setDirty(0); show('Published (demo, not saved)') }}>Publish changes</button>
      </div>
      {sections.map((s) => (
        <section key={s.key} className="panel stack" aria-labelledby={`h-${s.key}`}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <h2 id={`h-${s.key}`} style={{ margin: 0, flex: 1 }}>{s.name}</h2>
            <span className="small faint">{s.hint}</span>
            {adding === s.key ? (
              <select aria-label={`Add drama to ${s.name}`} className="input" style={{ width: 'auto', minHeight: 34 }} autoFocus defaultValue=""
                onBlur={() => setAdding('')}
                onChange={(e) => { const id = e.target.value; if (id) change(s.key, (items) => [...items, { id, meta: 'Added just now' }]); setAdding('') }}>
                <option value="" disabled>Choose a drama…</option>
                {PUBLISHED.filter((d) => !s.items.some((i) => i.id === d.id)).map((d: Drama) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" disabled={s.key === 'banner' && s.items.length >= 5} onClick={() => setAdding(s.key)}>+ Add drama</button>
            )}
          </div>
          <ol className="list" style={{ marginTop: 6 }}>
            {s.items.length === 0 && <li className="small faint" style={{ padding: '12px 0' }}>Empty. Viewers won&apos;t see this section.</li>}
            {s.items.map((slot, i) => {
              const d = getDrama(slot.id)!
              return (
                <li key={`${slot.id}-${i}`} className="row" style={{ minHeight: 64, borderTop: '1px solid var(--surface-2)' }}>
                  <span className="stack" style={{ gap: 0 }}>
                    <button type="button" className="icon-btn" style={{ width: 32, height: 26 }} aria-label={`Move ${d.title} up`} disabled={i === 0} onClick={() => move(s.key, i, -1)}><Icon name="chevronUp" size={16} width={2.4} /></button>
                    <button type="button" className="icon-btn" style={{ width: 32, height: 26 }} aria-label={`Move ${d.title} down`} disabled={i === s.items.length - 1} onClick={() => move(s.key, i, 1)}><Icon name="chevronDown" size={16} width={2.4} /></button>
                  </span>
                  <span className="faint" style={{ width: 18, fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ width: s.wide ? 78 : 33, height: 44, borderRadius: 6, background: d.color, flex: 'none' }} />
                  <span className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}><span style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</span><span className="tiny faint">{slot.meta}</span></span>
                  <button type="button" className="icon-btn" aria-label={`Remove ${d.title}`} style={{ color: 'var(--text-3)' }} onClick={() => change(s.key, (items) => items.filter((_, k) => k !== i))}><Icon name="close" size={16} width={2.2} /></button>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      {toast}
    </AdminShell>
  )
}
