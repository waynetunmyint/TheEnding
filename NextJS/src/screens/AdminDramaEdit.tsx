'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminShell, Breadcrumb, RoleNote, useAdmin } from '@/components/admin-shell'
import { LoadState, useRouteId, useToast } from '@/components/shell'
import { Icon, Poster } from '@/components/ui'
import { api, errorMessage, upload } from '@/lib/api'
import { invalidate, setData, useApi, useConfig } from '@/lib/data'
import { fromLocalInput, toLocalInput } from '@/lib/format'
import type { Drama } from '@/lib/types'

const LANGUAGES = ['English', 'Burmese', 'Chinese', 'Thai', 'Vietnamese', 'Indonesian', 'Spanish', 'Portuguese']
const BADGES = ['', 'Hot', 'New', 'Exclusive'] as const

function DramaTabs({ id, current, count }: { id: string; current: 'details' | 'episodes'; count: number }) {
  const tab = (key: 'details' | 'episodes', href: string, label: string) => (
    <Link href={href} aria-current={current === key ? 'page' : undefined} style={{ minHeight: 40, color: current === key ? '#FFFFFF' : 'var(--text-3)', fontWeight: current === key ? 700 : 600, textDecoration: 'none', boxShadow: current === key ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{label}</Link>
  )
  return (
    <nav aria-label="Drama sections" className="row" style={{ gap: 22, borderBottom: '1px solid var(--line)' }}>
      {tab('details', `/admin/dramas/${id}/`, 'Details')}
      {tab('episodes', `/admin/dramas/${id}/episodes/`, `Episodes (${count})`)}
    </nav>
  )
}

export { DramaTabs }

export function AdminDramaEdit({ isNew = false }: { isNew?: boolean }) {
  const id = useRouteId(2)
  const q = useApi<Drama>(!isNew && id && id !== '_' ? `/admin/dramas/${encodeURIComponent(id)}` : null)
  const config = useConfig()
  const [toast, show] = useToast()
  if (isNew) {
    if (!config.data) return <AdminShell><LoadState error={config.error} onRetry={config.reload} /></AdminShell>
    const blank: Drama = {
      id: '', title: '', synopsis: '', genres: [], episodes: 0, totalEpisodes: 0, freeEpisodes: config.data.coinsPerEpisode ? 10 : 0,
      coinsPerEpisode: config.data.coinsPerEpisode, status: 'Draft', completed: false, color: '#3A2A4E', color2: '#52406E', badge: '',
      language: 'English', releaseAt: 0, poster: '', banner: '', updatedAt: 0,
    }
    return <AdminShell><Form base={blank} isNew show={show} />{toast}</AdminShell>
  }
  if (!q.data) return <AdminShell><LoadState error={q.error} onRetry={q.reload} /></AdminShell>
  return <AdminShell><Form key={q.data.updatedAt} base={q.data} isNew={false} show={show} />{toast}</AdminShell>
}

function Form({ base, isNew, show }: { base: Drama; isNew: boolean; show: (m: string) => void }) {
  const admin = useAdmin()
  const config = useConfig()
  const router = useRouter()
  const [d, setD] = useState(base)
  const [release, setRelease] = useState(toLocalInput(base.releaseAt))
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState<'' | 'poster' | 'banner'>('')
  const can = admin.can('content')
  const set = (patch: Partial<Drama>) => setD({ ...d, ...patch })
  const valid = d.title.trim().length > 0

  const save = async (status: Drama['status']) => {
    if (!valid) { show('Add a title first'); return }
    setBusy(true)
    try {
      const body = { ...d, status, releaseAt: fromLocalInput(release) }
      const saved = isNew
        ? await api<Drama>('/admin/dramas', { method: 'POST', body })
        : await api<Drama>(`/admin/dramas/${encodeURIComponent(d.id)}`, { method: 'PUT', body })
      invalidate('/admin/dramas')
      invalidate('/dramas')
      invalidate('/home')
      if (isNew) {
        router.replace(`/admin/dramas/${saved.id}/`)
        return
      }
      setData(`/admin/dramas/${encodeURIComponent(d.id)}`, saved)
      show(status === 'Published' && base.status !== 'Published' ? 'Published' : status === 'Draft' && base.status !== 'Draft' ? 'Unpublished' : 'Saved')
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const sendImage = async (kind: 'poster' | 'banner', file: File | undefined) => {
    if (!file) return
    setUploading(kind)
    try {
      const saved = await upload<Drama>(`/admin/dramas/${encodeURIComponent(d.id)}/image?kind=${kind}`, file, {}, () => {})
      set({ poster: saved.poster, banner: saved.banner })
      invalidate('/admin/dramas')
      invalidate('/dramas')
      show(kind === 'poster' ? 'Poster updated' : 'Banner updated')
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setUploading('')
    }
  }

  return (
    <>
      <Breadcrumb parent="Dramas" href="/admin/dramas/" current={isNew ? 'New drama' : base.title} />
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>{isNew ? 'New drama' : d.title || 'Untitled drama'}</h1>
        {can && (
          <>
            <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: 42 }} disabled={busy} onClick={() => save(isNew ? 'Draft' : d.status)}>{isNew ? 'Save draft' : 'Save'}</button>
            {d.status !== 'Published' && <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} disabled={busy} onClick={() => save('Published')}>Save &amp; publish</button>}
          </>
        )}
      </div>
      <RoleNote perm="content" admin={admin} />
      {!isNew && <DramaTabs id={d.id} current="details" count={base.totalEpisodes} />}

      <div className="two-col">
        <form className="main-col" onSubmit={(e) => { e.preventDefault(); void save(isNew ? 'Draft' : d.status) }}>
          <fieldset disabled={!can} style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field"><label htmlFor="t">Title</label><input id="t" className="input" maxLength={80} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Drama title" required /></div>
            <div className="field">
              <label htmlFor="s">Synopsis</label>
              <textarea id="s" className="input" rows={4} maxLength={400} value={d.synopsis} onChange={(e) => set({ synopsis: e.target.value })} placeholder="Two or three sentences that hook the viewer." />
              <span className="tiny faint" style={{ textAlign: 'right' }}>{d.synopsis.length} / 400</span>
            </div>
            <div className="field">
              <span className="label">Genres and tags</span>
              <div className="chips">
                {d.genres.map((g) => (
                  <span key={g} className="chip" style={{ background: 'var(--accent-soft)', color: '#FF8FA0', paddingRight: 4, gap: 2 }}>{g}
                    <button type="button" aria-label={`Remove ${g}`} className="icon-btn" style={{ width: 28, height: 28, color: '#FF8FA0' }} onClick={() => set({ genres: d.genres.filter((x) => x !== g) })}><Icon name="close" size={14} width={2.4} /></button>
                  </span>
                ))}
                {adding ? (
                  <select aria-label="Add genre" className="input" style={{ width: 'auto', minHeight: 34 }} autoFocus defaultValue="" onChange={(e) => { if (e.target.value) set({ genres: [...d.genres, e.target.value] }); setAdding(false) }} onBlur={() => setAdding(false)}>
                    <option value="" disabled>Choose…</option>{(config.data?.genres ?? []).filter((g) => !d.genres.includes(g)).map((g) => <option key={g}>{g}</option>)}
                  </select>
                ) : (
                  <button type="button" className="chip" style={{ background: 'none', border: '1.5px dashed #3A3340' }} onClick={() => setAdding(true)}>+ Add</button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
              <div className="field"><label htmlFor="te">Planned episodes</label><input id="te" className="input" type="number" min={0} max={500} value={d.totalEpisodes} onChange={(e) => set({ totalEpisodes: Number(e.target.value) })} /></div>
              <div className="field"><label htmlFor="fe">Free episodes</label><input id="fe" className="input" type="number" min={0} max={500} value={d.freeEpisodes} onChange={(e) => set({ freeEpisodes: Number(e.target.value) })} /></div>
              <div className="field"><label htmlFor="cp">Coins per episode</label><input id="cp" className="input" type="number" min={0} value={d.coinsPerEpisode} onChange={(e) => set({ coinsPerEpisode: Number(e.target.value) })} /></div>
              <div className="field"><label htmlFor="lg">Language</label><select id="lg" className="input" value={d.language} onChange={(e) => set({ language: e.target.value })}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select></div>
            </div>
            <label className="row small" style={{ gap: 10, minHeight: 44 }}><input type="checkbox" checked={d.completed} onChange={(e) => set({ completed: e.target.checked })} style={{ width: 20, height: 20 }} />Series is complete (all episodes are out)</label>
            <span className="tiny faint">Changing free episodes updates which episodes are free; you can still lock or free single episodes on the Episodes tab.</span>
          </fieldset>
        </form>

        <aside className="side-col">
          <div className="field">
            <span className="label">Poster (3:4)</span>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ width: 120 }}><Poster drama={d} showEps={false} badge={false} /></div>
              <div className="stack gap-6">
                {isNew ? <span className="tiny faint">Save the draft first, then upload images.</span> : (
                  <label className="btn btn-secondary btn-sm" style={{ cursor: can ? 'pointer' : 'not-allowed' }} aria-disabled={!can || uploading !== ''}>
                    {uploading === 'poster' ? 'Uploading…' : d.poster ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!can || uploading !== ''} onChange={(e) => { void sendImage('poster', e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                )}
                <span className="tiny faint">JPG, PNG or WebP, 900×1200, up to 8 MB</span>
              </div>
            </div>
          </div>
          <div className="field">
            <span className="label">Home banner (16:9)</span>
            {isNew ? <span className="tiny faint">Save the draft first, then upload images.</span> : (
              <label className="dropzone" style={{ minHeight: 140, cursor: can ? 'pointer' : 'not-allowed', background: d.banner ? `center / cover url(${d.banner})` : undefined }}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (can) void sendImage('banner', e.dataTransfer.files[0]) }}>
                {!d.banner && <Icon name="upload" size={24} style={{ color: 'var(--text-2)' }} />}
                <span className="small" style={{ color: d.banner ? '#FFFFFF' : 'var(--text-3)', background: d.banner ? 'rgba(15,12,17,.7)' : undefined, padding: '2px 8px', borderRadius: 8 }}>
                  {uploading === 'banner' ? 'Uploading…' : <>Drop image or <span style={{ color: 'var(--accent)', fontWeight: 700 }}>browse</span></>}
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!can || uploading !== ''} onChange={(e) => { void sendImage('banner', e.target.files?.[0]); e.target.value = '' }} />
              </label>
            )}
          </div>
          <fieldset disabled={!can} style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label htmlFor="st">Status</label>
              <select id="st" className="input" value={d.status} onChange={(e) => set({ status: e.target.value as Drama['status'] })}><option>Published</option><option>Scheduled</option><option>Draft</option></select></div>
            <div className="field"><label htmlFor="rd">Release date and time</label><input id="rd" className="input" type="datetime-local" value={release} onChange={(e) => setRelease(e.target.value)} />
              <span className="tiny faint">Scheduled dramas premiere automatically at this time, and reminders go out.</span></div>
            <div className="field"><label htmlFor="bd">Badge</label><select id="bd" className="input" value={d.badge} onChange={(e) => set({ badge: e.target.value as Drama['badge'] })}>{BADGES.map((b) => <option key={b} value={b}>{b || 'None'}</option>)}</select></div>
            <div className="row" style={{ gap: 14 }}>
              <label className="field" style={{ flex: 1 }}><span className="label">Placeholder colour</span><input type="color" value={d.color} onChange={(e) => set({ color: e.target.value })} style={{ width: '100%', height: 40, background: 'none', border: 'none' }} /></label>
              <label className="field" style={{ flex: 1 }}><span className="label">Accent</span><input type="color" value={d.color2} onChange={(e) => set({ color2: e.target.value })} style={{ width: '100%', height: 40, background: 'none', border: 'none' }} /></label>
            </div>
          </fieldset>
          {!isNew && d.status !== 'Draft' && can && (
            <div className="stack gap-6" style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)', alignSelf: 'flex-start', padding: 0 }} disabled={busy} onClick={() => save('Draft')}>Unpublish drama</button>
              <span className="tiny faint">Viewers who unlocked episodes keep access when it is published again.</span>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
