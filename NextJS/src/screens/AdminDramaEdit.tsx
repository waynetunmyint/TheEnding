'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { Icon, Poster } from '@/components/ui'
import { GENRES, getDrama, type Drama } from '@/data/dummy'

const BLANK: Drama = {
  id: 'new', title: '', genres: [], synopsis: '', episodes: 0, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Draft',
  completed: false, color: '#26202A', color2: '#3A3340', releaseDate: '',
}

export function AdminDramaEdit({ id }: { id?: string }) {
  const base = (id && getDrama(id)) || BLANK
  const isNew = !id
  const [toast, show] = useToast()
  const [title, setTitle] = useState(base.title)
  const [synopsis, setSynopsis] = useState(base.synopsis)
  const [tags, setTags] = useState<string[]>(base.genres)
  const [free, setFree] = useState(base.freeEpisodes)
  const [price, setPrice] = useState(base.coinsPerEpisode)
  const [status, setStatus] = useState(base.status)
  const [release, setRelease] = useState(base.releaseDate ? `${base.releaseDate} · 8:00 PM` : '')
  const [adding, setAdding] = useState(false)
  const valid = title.trim().length > 0

  const save = (publish: boolean) => {
    if (!valid) { show('Add a title first'); return }
    if (publish) setStatus('Published')
    show(publish ? 'Published (demo, not saved)' : 'Draft saved (demo, not saved)')
  }

  return (
    <AdminShell>
      <nav aria-label="Breadcrumb" className="small faint"><Link href="/admin/dramas/">Dramas</Link> / {isNew ? 'New drama' : base.title}</nav>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>{isNew ? 'New drama' : title || 'Untitled drama'}</h1>
        <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: 42 }} onClick={() => save(false)}>Save draft</button>
        <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} onClick={() => save(true)}>Save &amp; publish</button>
      </div>
      {!isNew && (
        <nav aria-label="Drama sections" className="row" style={{ gap: 22, borderBottom: '1px solid var(--line)' }}>
          <Link href={`/admin/dramas/${base.id}/`} aria-current="page" style={{ minHeight: 40, color: '#FFFFFF', fontWeight: 700, textDecoration: 'none', boxShadow: 'inset 0 -2px 0 #FF3D5E' }}>Details</Link>
          <Link href={`/admin/dramas/${base.id}/episodes/`} style={{ minHeight: 40, color: 'var(--text-3)', fontWeight: 600, textDecoration: 'none' }}>Episodes ({base.episodes})</Link>
        </nav>
      )}

      <div className="two-col">
        <form className="main-col" onSubmit={(e) => { e.preventDefault(); save(false) }}>
          <div className="field"><label htmlFor="t">Title</label><input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Drama title" required /></div>
          <div className="field">
            <label htmlFor="s">Synopsis</label>
            <textarea id="s" className="input" rows={4} maxLength={400} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Two or three sentences that hook the viewer." />
            <span className="tiny faint" style={{ textAlign: 'right' }}>{synopsis.length} / 400</span>
          </div>
          <div className="field">
            <span className="label">Genres and tags</span>
            <div className="chips">
              {tags.map((g) => (
                <span key={g} className="chip" style={{ background: 'var(--accent-soft)', color: '#FF8FA0', paddingRight: 4, gap: 2 }}>{g}
                  <button type="button" aria-label={`Remove ${g}`} className="icon-btn" style={{ width: 28, height: 28, color: '#FF8FA0' }} onClick={() => setTags(tags.filter((x) => x !== g))}><Icon name="close" size={14} width={2.4} /></button>
                </span>
              ))}
              {adding ? (
                <select aria-label="Add genre" className="input" style={{ width: 'auto', minHeight: 34 }} autoFocus defaultValue="" onChange={(e) => { if (e.target.value) setTags([...tags, e.target.value]); setAdding(false) }} onBlur={() => setAdding(false)}>
                  <option value="" disabled>Choose…</option>{GENRES.filter((g) => !tags.includes(g)).map((g) => <option key={g}>{g}</option>)}
                </select>
              ) : (
                <button type="button" className="chip" style={{ background: 'none', border: '1.5px dashed #3A3340' }} onClick={() => setAdding(true)}>+ Add</button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            <div className="field"><label htmlFor="fe">Free episodes</label><input id="fe" className="input" type="number" min={0} value={free} onChange={(e) => setFree(Number(e.target.value))} /></div>
            <div className="field"><label htmlFor="cp">Coins per episode</label><input id="cp" className="input" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
            <div className="field"><label htmlFor="lg">Language</label><select id="lg" className="input"><option>English</option><option>Burmese</option><option>Chinese</option></select></div>
          </div>
        </form>

        <aside className="side-col">
          <div className="field">
            <span className="label">Poster (3:4)</span>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ width: 120 }}><Poster drama={{ ...base, title }} showEps={false} badge={false} /></div>
              <div className="stack gap-6">
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>{isNew ? 'Upload' : 'Replace'}<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={() => show('Poster selected (demo, not uploaded)')} /></label>
                <span className="tiny faint">JPG or PNG, 900×1200</span>
              </div>
            </div>
          </div>
          <div className="field">
            <span className="label">Home banner (16:9)</span>
            <label className="dropzone" style={{ minHeight: 140, cursor: 'pointer' }}>
              <Icon name="upload" size={24} style={{ color: 'var(--text-2)' }} />
              <span className="small faint">Drop image or <span style={{ color: 'var(--accent)', fontWeight: 700 }}>browse</span></span>
              <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={() => show('Banner selected (demo, not uploaded)')} />
            </label>
          </div>
          <div className="field"><label htmlFor="st">Status</label>
            <select id="st" className="input" value={status} onChange={(e) => setStatus(e.target.value as Drama['status'])}><option>Published</option><option>Scheduled</option><option>Draft</option></select></div>
          <div className="field"><label htmlFor="rd">Release date and time</label><input id="rd" className="input" placeholder="dd/MM/yyyy · 8:00 PM" value={release} onChange={(e) => setRelease(e.target.value)} /></div>
          {!isNew && (
            <div className="stack gap-6" style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)', alignSelf: 'flex-start', padding: 0 }} onClick={() => { setStatus('Draft'); show('Unpublished (demo)') }}>Unpublish drama</button>
              <span className="tiny faint">Viewers who unlocked episodes keep access.</span>
            </div>
          )}
        </aside>
      </div>
      {toast}
    </AdminShell>
  )
}
