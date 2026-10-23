'use client'

import { useEffect, useRef, useState } from 'react'
import { AdminShell, Breadcrumb, EmptyPanel, RoleNote, StatusText, useAdmin } from '@/components/admin-shell'
import { LoadState, useRouteId, useToast } from '@/components/shell'
import { Icon, Switch } from '@/components/ui'
import { api, errorMessage, upload } from '@/lib/api'
import { invalidate, setData, useApi } from '@/lib/data'
import { duration } from '@/lib/format'
import { DramaTabs } from '@/screens/AdminDramaEdit'
import type { AdminEpisode, Drama } from '@/lib/types'

type Data = { drama: Drama; episodes: AdminEpisode[] }
type QueueItem = { key: string; file: File; name: string; ep: number; progress: number; length: number; status: 'Waiting' | 'Uploading' | 'Ready' | 'Failed'; reason?: string }

function epFromName(name: string, fallback: number) {
  const m = name.match(/ep\s*0*(\d+)/i) ?? name.match(/(\d+)/)
  return m ? Number(m[1]) : fallback
}

// Reads the video's dimensions and length in the browser before uploading.
function probe(file: File): Promise<{ vertical: boolean; length: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ vertical: v.videoHeight > v.videoWidth, length: Math.round(v.duration || 0) }) }
    v.onerror = () => { URL.revokeObjectURL(url); resolve({ vertical: false, length: 0 }) }
    v.src = url
  })
}

function TitleCell({ value, disabled, onSave }: { value: string; disabled: boolean; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  return (
    <input className="input" aria-label="Episode title" value={v} maxLength={80} disabled={disabled} onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v.trim() && v.trim() !== value) onSave(v.trim()); else setV(value) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      style={{ minHeight: 36, background: 'transparent', borderColor: 'transparent', padding: '0 8px', fontSize: 14 }} />
  )
}

export function AdminEpisodes() {
  const id = useRouteId(2)
  const path = id && id !== '_' ? `/admin/dramas/${encodeURIComponent(id)}/episodes` : null
  const q = useApi<Data>(path)
  const admin = useAdmin()
  const [toast, show] = useToast()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(0)
  const running = useRef(false)
  const can = admin.can('content')

  // Uploads run one at a time; each finished upload refreshes the episode table.
  useEffect(() => {
    if (running.current || !path) return
    const next = queue.find((x) => x.status === 'Waiting')
    if (!next) return
    running.current = true
    const patch = (p: Partial<QueueItem>) => setQueue((qs) => qs.map((x) => (x.key === next.key ? { ...x, ...p } : x)))
    patch({ status: 'Uploading' })
    upload<Data>(`/admin/dramas/${encodeURIComponent(id)}/episodes/${next.ep}/video`, next.file, { length: String(next.length) }, (pct) => patch({ progress: pct }))
      .then((data) => { setData(path, data); patch({ status: 'Ready', progress: 100 }); invalidate('/dramas') })
      .catch((e) => patch({ status: 'Failed', reason: errorMessage(e) }))
      .finally(() => { running.current = false; setQueue((qs) => [...qs]) })
  }, [queue, path, id])

  if (!q.data) return <AdminShell><LoadState error={q.error} onRetry={q.reload} /></AdminShell>
  const { drama: d, episodes } = q.data
  const pageSize = 15
  const pages = Math.max(1, Math.ceil(episodes.length / pageSize))
  const current = Math.min(page, pages - 1)
  const shown = episodes.slice(current * pageSize, current * pageSize + pageSize)

  const addFiles = async (files: FileList | File[] | null, forceEp?: number) => {
    if (!files || !can) return
    const list = Array.from(files)
    let nextNumber = (episodes.length ? episodes[episodes.length - 1].n : 0) + 1
    const items: QueueItem[] = []
    for (const f of list) {
      const isVideo = f.type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/i.test(f.name)
      const meta = isVideo ? await probe(f) : { vertical: false, length: 0 }
      const ep = forceEp ?? epFromName(f.name, nextNumber++)
      items.push({
        key: `${f.name}-${Date.now()}-${Math.random()}`, file: f, name: f.name, ep, progress: 0, length: meta.length,
        status: isVideo && meta.vertical && ep <= 500 ? 'Waiting' : 'Failed',
        reason: !isVideo ? 'not a video file' : !meta.vertical ? 'not vertical 9:16' : ep > 500 ? 'episode number over 500' : undefined,
      })
    }
    setQueue((qs) => [...qs, ...items])
  }

  const patch = async (ns: number[], body: { free?: boolean; published?: boolean; title?: string }, msg: string) => {
    try {
      const data = await api<Data>(`/admin/dramas/${encodeURIComponent(d.id)}/episodes`, { method: 'PATCH', body: { ns, ...body } })
      setData(path!, data)
      invalidate('/dramas')
      show(msg)
      setSelected([])
    } catch (e) {
      show(errorMessage(e))
    }
  }

  return (
    <AdminShell>
      <Breadcrumb parent="Dramas" href="/admin/dramas/" current={d.title} />
      <h1>{d.title}</h1>
      <DramaTabs id={d.id} current="episodes" count={episodes.length} />
      <RoleNote perm="content" admin={admin} />

      {can && (
        <div className="two-col">
          <label className="dropzone main-col" style={{ minHeight: 150, cursor: 'pointer' }}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files) }}>
            <Icon name="upload" size={28} style={{ color: 'var(--text-2)' }} />
            <strong>Drop episode videos here</strong>
            <span className="small faint" style={{ lineHeight: 1.5, maxWidth: 420 }}>Vertical 9:16 MP4 (H.264) plays on every device; WebM doesn&apos;t play on iPhone. Up to 500 MB each. Name files EP01.mp4, EP02.mp4… and they are numbered for you. New episodes start unpublished.</span>
            <span className="btn btn-secondary btn-sm">Choose files</span>
            <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm" multiple className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} />
          </label>
          <section className="panel side-col" style={{ gap: 12 }} aria-labelledby="uq">
            <div className="row between"><h2 id="uq" style={{ margin: 0 }}>Upload queue</h2>
              {queue.some((x) => x.status === 'Ready' || x.status === 'Failed') && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQueue((qs) => qs.filter((x) => x.status === 'Waiting' || x.status === 'Uploading'))}>Clear finished</button>}
            </div>
            {queue.length === 0 && <span className="small faint">No uploads yet.</span>}
            {queue.map((x) => (
              <div key={x.key} className="stack gap-6">
                <div className="row small" style={{ gap: 10 }}>
                  <span style={{ flex: 1, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name} → EP {x.ep}</span>
                  <span style={{ fontWeight: 600, color: x.status === 'Failed' ? 'var(--bad)' : x.status === 'Ready' ? 'var(--good)' : 'var(--text-2)' }}>
                    {x.status === 'Uploading' ? `Uploading ${x.progress}%` : x.status === 'Failed' ? `Failed: ${x.reason}` : x.status}
                  </span>
                  {x.status === 'Failed' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setQueue((qs) => qs.filter((y) => y.key !== x.key))}>Remove</button>}
                </div>
                <div className="bar" role="progressbar" aria-label={x.name} aria-valuenow={x.progress} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${x.status === 'Failed' || x.status === 'Ready' ? 100 : x.progress}%`, background: x.status === 'Failed' ? 'var(--bad)' : x.status === 'Ready' ? 'var(--good)' : 'var(--accent)' }} />
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {can && (
        <div className="row small" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="faint" style={{ flex: 1 }}>{selected.length ? `${selected.length} selected` : 'Select episodes for bulk changes'}</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!selected.length} onClick={() => patch(selected, { free: true }, `Set free · ${selected.length} episodes`)}>Set free</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!selected.length} onClick={() => patch(selected, { free: false }, `Set locked · ${selected.length} episodes`)}>Set locked</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!selected.length} onClick={() => patch(selected, { published: true }, `Published · ${selected.length} episodes`)}>Publish</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!selected.length} onClick={() => patch(selected, { published: false }, `Unpublished · ${selected.length} episodes`)}>Unpublish</button>
        </div>
      )}

      {episodes.length === 0 ? (
        <EmptyPanel title="No episodes yet" body="Drop the episode videos above to start." icon="upload" />
      ) : (
        <div className="table-box">
          <table className="table" style={{ minWidth: 860 }}>
            <thead><tr>
              <th style={{ width: 28 }}><input type="checkbox" aria-label="Select all on this page" disabled={!can} checked={shown.every((e) => selected.includes(e.n))} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...shown.map((x) => x.n)])) : selected.filter((n) => !shown.some((x) => x.n === n)))} /></th>
              <th>EP</th><th>Title</th><th>Length</th><th>Video</th><th>Access</th><th>Published</th><th><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.n}>
                  <td><input type="checkbox" aria-label={`Select EP ${e.n}`} disabled={!can} checked={selected.includes(e.n)} onChange={() => setSelected((s) => s.includes(e.n) ? s.filter((x) => x !== e.n) : [...s, e.n])} /></td>
                  <td style={{ fontWeight: 700 }}>{e.n}</td>
                  <td style={{ minWidth: 200 }}><TitleCell key={e.title} value={e.title} disabled={!can} onSave={(title) => patch([e.n], { title }, `Renamed EP ${e.n}`)} /></td>
                  <td className="muted">{e.length ? duration(e.length) : '—'}</td>
                  <td><StatusText value={e.videoStatus} /></td>
                  <td style={{ color: e.free ? 'var(--good)' : 'var(--text-2)' }}>{e.free ? 'Free' : `Locked · ${d.coinsPerEpisode} coins`}</td>
                  <td><Switch label={`Publish EP ${e.n}`} checked={e.published} disabled={!can} onChange={(v) => patch([e.n], { published: v }, `${v ? 'Published' : 'Unpublished'} EP ${e.n}`)} /></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {can && (
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}>{e.videoStatus === 'Ready' ? 'Replace video' : e.videoStatus === 'Failed' ? 'Upload again' : 'Upload video'}
                        <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm" className="sr-only" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void addFiles([f], e.n); ev.target.value = '' }} />
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="row between small faint">
          <span>EP {shown[0]?.n}–{shown[shown.length - 1]?.n} of {episodes.length}</span>
          <span className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm btn-secondary" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
            <button type="button" className="btn btn-sm btn-secondary" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
          </span>
        </div>
      )}
      {toast}
    </AdminShell>
  )
}
