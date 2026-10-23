'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell, EmptyPanel, StatusText } from '@/components/admin-shell'
import { LoadState } from '@/components/shell'
import { Avatar, Icon } from '@/components/ui'
import { useApi } from '@/lib/data'
import { fmtDate } from '@/lib/format'
import type { AdminUser } from '@/lib/types'

const FILTERS = ['All', 'VIP', 'Has coins', 'Banned', 'Admins'] as const

export default function AdminUsers() {
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [f, setF] = useState<(typeof FILTERS)[number]>('All')
  const q = useApi<{ users: AdminUser[]; guests: number }>(`/admin/users?filter=${encodeURIComponent(f)}&q=${encodeURIComponent(search)}`)
  return (
    <AdminShell>
      <h1>Users</h1>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <form className="search-pill" role="search" style={{ flex: '1 1 280px', borderRadius: 12, border: '1.5px solid #3A3340' }} onSubmit={(e) => { e.preventDefault(); setSearch(text.trim()) }}>
          <Icon name="search" size={16} width={2.2} />
          <input type="search" aria-label="Search users" placeholder="Name, email or user ID, then Enter" value={text} onChange={(e) => { setText(e.target.value); if (!e.target.value) setSearch('') }} />
        </form>
        <div role="radiogroup" aria-label="Filter" className="chips">
          {FILTERS.map((x) => <button key={x} type="button" role="radio" aria-checked={f === x} className="chip" onClick={() => setF(x)}>{x}</button>)}
        </div>
      </div>
      {!q.data ? <LoadState error={q.error} onRetry={q.reload} /> : q.data.users.length === 0 ? (
        <EmptyPanel title="No users match" body="Try a different name, email or filter." icon="user" />
      ) : (
        <div className="table-box">
          <table className="table" style={{ minWidth: 880 }}>
            <thead><tr><th>User</th><th>Sign-in</th><th>Coins</th><th>VIP</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {q.data.users.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}/`} className="row" style={{ color: '#FFFFFF', textDecoration: 'none', gap: 10 }}>
                    <Avatar initial={u.initial} color={u.color} size={34} />
                    <span className="stack" style={{ gap: 2, minWidth: 0 }}><span style={{ fontWeight: 600 }}>{u.name}{u.role && <span className="tiny" style={{ color: 'var(--accent)', marginLeft: 6 }}>{u.role}</span>}</span><span className="tiny faint">{[u.email, `ID ${u.id}`].filter(Boolean).join(' · ')}</span></span>
                  </Link></td>
                  <td className="muted">{u.via}</td>
                  <td>{u.coins.toLocaleString('en-US')}</td>
                  <td style={{ color: u.vipUntil ? 'var(--gold)' : 'var(--text-3)' }}>{u.vipUntil ? `Until ${fmtDate(u.vipUntil)}` : '—'}</td>
                  <td className="faint">{fmtDate(u.joined)}</td>
                  <td><StatusText value={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.data && <p className="small faint" style={{ margin: 0 }}>Showing {q.data.users.length} signed-in {q.data.users.length === 1 ? 'account' : 'accounts'} (up to 300). {q.data.guests.toLocaleString('en-US')} guest {q.data.guests === 1 ? 'account' : 'accounts'} not listed.</p>}
    </AdminShell>
  )
}
