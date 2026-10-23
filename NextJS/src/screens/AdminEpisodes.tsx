'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdminShell, StatusText } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { Icon, Switch } from '@/components/ui'
import { episodeLength, episodeTitle, formatTime, getDrama } from '@/data/dummy'

type QueueItem = { key: string; name: string; ep: number; progress: number; status: 'Waiting' | 'Uploading' | 'Converting' | 'Ready' | 'Failed'; reason?: string }
type Episode = { n: number; title: string; len: number; free: boolean; published: boolean; video: 'Ready' | 'Failed' }

function epFromName(name: string, fallback: number) {
  const m = name.match(/ep\s*0*(\d+)/i) ?? name.match(/(\d+)/)
  return m ? Number(m[1]) : fallback
}

// Reads only the video's dimensions locally; nothing is uploaded in the mockup.
function checkVertical(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.videoHeight > v.videoWidth) }
    v.onerror = () => { URL.revokeObjectURL(url); resolve(false) }
    v.src = url
  })
}

export function AdminEpisodes({ id }: { id: string }) {
  const d = getDrama(id)!
  const [toast, show] = useToast()
  const initialCount = d.completed ? d.episodes : d.id === 'ex-husband' ? 12 : 36
  const [episodes, setEpisodes] = useState<Episode[]>(() => Array.from({ length: initialCount }, (_, i) => ({
    n: i + 1, title: episodeTitle(i + 1), len: episodeLength(i + 1), free: i + 1 <= d.freeEpisodes, published: d.status === 'Published',
    video: d.id === 'reborn-empire' && i + 1 === 42 ? 'Failed' : 'Ready',
  })))
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(0)
  const pageSize = 15
  const pages = Math.max(1, Math.ceil(episodes.length / pageSize))
  const shown = episodes.slice(page * pageSize, page * pageSize + pageSize)

  // Simulated upload and conversion progress.
  useEffect(() => {
    if (!queue.some((q) => q.status === 'Uploading' || q.status === 'Converting' || q.status === 'Waiting')) return
    const t = setInterval(() => {
      setQueue((qs) => {
        let started = qs.some((q) => q.status === 'Uploading')
        return qs.map((q) => {
          if (q.status === 'Uploading') {
            const p = Math.min(100, q.progress + 12)
            return p >= 100 ? { ...q, progress: 100, status: 'Converting' } : { ...q, progress: p }
          }
          if (q.status === 'Converting') return { ...q, status: 'Ready' }
          if (q.status === 'Waiting' && !started) { started = true; return { ...q, status: 'Uploading' } }
          return q
        })
      })
    }, 500)
    return () => clearInterval(t)
  }, [queue])

  // Add finished uploads to the episode table.
  useEffect(() => {
    const ready = queue.filter((q) => q.status === 'Ready' && !episodes.some((e) => e.n === q.ep && e.video === 'Ready'))
    if (!ready.length) return
    const t = setTimeout(() => {
      setEpisodes((eps) => {
        const next = [...eps]
        ready.forEach((q) => {
          const i = next.findIndex((e) => e.n === q.ep)
          const ep: Episode = { n: q.ep, title: episodeTitle(q.ep), len: episodeLength(q.ep), free: q.ep <= d.freeEpisodes, published: false, video: 'Ready' }
          if (i >= 0) next[i] = { ...next[i], video: 'Ready' }
          else next.push(ep)
        })
        return next.sort((a, b) => a.n - b.n)
      })
    }, 0)
    return () => clearTimeout(t)
  }, [queue, episodes, d.freeEpisodes])

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
    const nextNumber = episodes.length ? episodes[episodes.length - 1].n + 1 : 1
    const items: QueueItem[] = []
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      const vertical = f.type.startsWith('video/') && await checkVertical(f)
      items.push({
        key: `${f.name}-${Date.now()}-${i}`, name: f.name, ep: epFromName(f.name, nextNumber + i), progress: 0,
        status: vertical ? 'Waiting' : 'Failed', reason: f.type.startsWith('video/') ? 'not vertical 9:16' : 'not a video file',
      })
    }
    setQueue((q) => [...q, ...items])
  }

  const toggleSel = (n: number) => setSelected((s) => s.includes(n) ? s.filter((x) => x !== n) : [...s, n])
  const bulk = (fn: (e: Episode) => Episode, msg: string) => {
    setEpisodes((eps) => eps.map((e) => selected.includes(e.n) ? fn(e) : e))
    show(`${msg} · ${selected.length} episodes`)
    setSelected([])
  }

  return (
    <AdminShell>
      <nav aria-label="Breadcrumb" className="small faint"><Link href="/admin/dramas/">Dramas</Link> / {d.title}</nav>
      <h1>{d.title}</h1>
      <nav aria-label="Drama sections" className="row" style={{ gap: 22, borderBottom: '1px solid var(--line)' }}>
        <Link href={`/admin/dramas/${d.id}/`} style={{ minHeight: 40, color: 'var(--text-3)', fontWeight: 600, textDecoration: 'none' }}>Details</Link>
        <Link href={`/admin/dramas/${d.id}/episodes/`} aria-current="page" style={{ minHeight: 40, color: '#FFFFFF', fontWeight: 700, textDecoration: 'none', boxShadow: 'inset 0 -2px 0 #FF3D5E' }}>Episodes ({episodes.length})</Link>
      </nav>

      <div className="two-col">
        <label className="dropzone main-col" style={{ minHeight: 150, cursor: 'pointer' }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}>
          <Icon name="upload" size={28} style={{ color: 'var(--text-2)' }} />
          <strong>Drop episode videos here</strong>
          <span className="small faint" style={{ lineHeight: 1.5, maxWidth: 420 }}>Vertical 9:16 MP4. Name files EP01.mp4, EP02.mp4… and they are numbered for you. Mockup: files stay on your computer.</span>
          <span className="btn btn-secondary btn-sm">Choose files</span>
          <input type="file" accept="video/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
        <section className="panel side-col" style={{ gap: 12 }} aria-labelledby="uq">
          <h2 id="uq" style={{ margin: 0 }}>Upload queue</h2>
          {queue.length === 0 && <span className="small faint">No uploads yet.</span>}
          {queue.map((q) => (
            <div key={q.key} className="stack gap-6">
              <div className="row small" style={{ gap: 10 }}>
                <span style={{ flex: 1, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name} → EP {q.ep}</span>
                <span style={{ fontWeight: 600, color: q.status === 'Failed' ? 'var(--bad)' : q.status === 'Ready' ? 'var(--good)' : q.status === 'Converting' ? 'var(--info)' : 'var(--text-2)' }}>
                  {q.status === 'Uploading' ? `Uploading ${q.progress}%` : q.status === 'Converting' ? 'Converting for streaming' : q.status === 'Failed' ? `Failed: ${q.reason}` : q.status}
                </span>
                {q.status === 'Failed' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setQueue((qs) => qs.filter((x) => x.key !== q.key))}>Remove</button>}
              </div>
              <div className="bar" role="progressbar" aria-label={q.name} aria-valuenow={q.progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${q.status === 'Failed' || q.status === 'Ready' || q.status === 'Converting' ? 100 : q.progress}%`, background: q.status === 'Failed' ? 'var(--bad)' : q.status === 'Ready' ? 'var(--good)' : q.status === 'Converting' ? 'var(--info)' : 'var(--accent)' }} />
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="row small" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="faint" style={{ flex: 1 }}>{selected.length ? `${selected.length} selected` : 'Select episodes for bulk changes'}</span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!selected.length} onClick={() => bulk((e) => ({ ...e, free: true }), 'Set free')}>Set free</button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!selected.length} onClick={() => bulk((e) => ({ ...e, free: false }), 'Set locked')}>Set locked</button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!selected.length} onClick={() => bulk((e) => ({ ...e, published: true }), 'Published')}>Publish</button>
      </div>

      {episodes.length === 0 ? (
        <div className="empty panel"><h2>No episodes yet</h2><p>Drop the episode videos above to start.</p></div>
      ) : (
        <div className="table-box">
          <table className="table" style={{ minWidth: 820 }}>
            <thead><tr><th style={{ width: 28 }}><input type="checkbox" aria-label="Select all on this page" checked={shown.every((e) => selected.includes(e.n))} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...shown.map((x) => x.n)])) : selected.filter((n) => !shown.some((x) => x.n === n)))} /></th><th>EP</th><th>Title</th><th>Length</th><th>Video</th><th>Access</th><th>Published</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.n}>
                  <td><input type="checkbox" aria-label={`Select EP ${e.n}`} checked={selected.includes(e.n)} onChange={() => toggleSel(e.n)} /></td>
                  <td style={{ fontWeight: 700 }}>{e.n}</td>
                  <td>{e.title}</td>
                  <td className="muted">{formatTime(e.len)}</td>
                  <td><StatusText value={e.video} /></td>
                  <td style={{ color: e.free ? 'var(--good)' : 'var(--text-2)' }}>{e.free ? 'Free' : `Locked · ${d.coinsPerEpisode} coins`}</td>
                  <td><Switch label={`Publish EP ${e.n}`} checked={e.published} onChange={(v) => setEpisodes((eps) => eps.map((x) => x.n === e.n ? { ...x, published: v } : x))} /></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}>{e.video === 'Failed' ? 'Upload again' : 'Replace video'}
                      <input type="file" accept="video/*" className="sr-only" onChange={(ev) => { const f = ev.target.files; if (f?.[0]) { const renamed = new File([f[0]], `EP${e.n}.mp4`, { type: f[0].type }); const dt = new DataTransfer(); dt.items.add(renamed); addFiles(dt.files) } ev.target.value = '' }} />
                    </label>
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
            <button type="button" className="btn btn-sm btn-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
          </span>
        </div>
      )}
      {toast}
    </AdminShell>
  )
}
