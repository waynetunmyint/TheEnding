'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell, StatusText } from '@/components/admin-shell'
import { Icon } from '@/components/ui'
import { DRAMAS, GENRES } from '@/data/dummy'

const STATUSES = ['All', 'Published', 'Scheduled', 'Draft'] as const

export default function AdminDramas() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All')
  const [genre, setGenre] = useState('All genres')
  const rows = DRAMAS
    .filter((d) => status === 'All' || d.status === status)
    .filter((d) => genre === 'All genres' || d.genres.includes(genre))
    .filter((d) => d.title.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Dramas</h1>
        <Link href="/admin/dramas/new/" className="btn btn-primary btn-sm" style={{ minHeight: 42 }}><Icon name="plus" size={16} width={2.6} />New drama</Link>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <label className="search-pill" style={{ flex: '1 1 260px', borderRadius: 12, border: '1.5px solid #3A3340' }}>
          <Icon name="search" size={16} width={2.2} />
          <input type="search" aria-label="Search dramas" placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div role="radiogroup" aria-label="Status" className="chips">
          {STATUSES.map((s) => <button key={s} type="button" role="radio" aria-checked={status === s} className="chip" onClick={() => setStatus(s)}>{s}</button>)}
        </div>
        <select aria-label="Genre" className="input" style={{ width: 'auto', minHeight: 42 }} value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option>All genres</option>{GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="empty panel">
          <div className="icon-circle"><Icon name="shorts" size={30} /></div>
          <h2>{q || status !== 'All' || genre !== 'All genres' ? 'No dramas match' : 'Add your first drama'}</h2>
          <p>{q || status !== 'All' || genre !== 'All genres' ? 'Try another search or filter.' : 'Create the drama, upload a poster, then drop in the episode videos.'}</p>
          <Link href="/admin/dramas/new/" className="btn btn-primary" style={{ marginTop: 8 }}>New drama</Link>
        </div>
      ) : (
        <div className="table-box">
          <table className="table" style={{ minWidth: 860 }}>
            <thead><tr><th>Drama</th><th>Episodes</th><th>Free</th><th>Coins / EP</th><th>Status</th><th>Release</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td><div className="row">
                    <div style={{ width: 36, height: 48, borderRadius: 6, background: d.color, flex: 'none' }} />
                    <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                      <Link href={`/admin/dramas/${d.id}/`} style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'none' }}>{d.title}</Link>
                      <span className="tiny faint">{d.genres.slice(0, 2).join(' · ')}</span>
                    </div>
                  </div></td>
                  <td>{d.id === 'reborn-empire' ? <>71 / 72<span className="tiny" style={{ display: 'block', color: 'var(--warn)' }}>1 failed</span></> : d.completed ? `${d.episodes} / ${d.episodes}` : `${d.id === 'ex-husband' ? 12 : 36} / ${d.episodes}`}</td>
                  <td className="muted">EP 1–{d.freeEpisodes}</td>
                  <td className="muted">{d.coinsPerEpisode}</td>
                  <td><StatusText value={d.status} /></td>
                  <td className="faint">{d.releaseDate}</td>
                  <td style={{ textAlign: 'right' }}><Link href={`/admin/dramas/${d.id}/episodes/`} style={{ fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Episodes</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small faint" style={{ margin: 0 }}>Showing {rows.length} of {DRAMAS.length}</p>
    </AdminShell>
  )
}
