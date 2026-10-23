'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell, StatusText } from '@/components/admin-shell'
import { Avatar, Icon } from '@/components/ui'
import { ADMIN_USERS } from '@/data/dummy'

const FILTERS = ['All', 'VIP', 'Has coins', 'Banned'] as const

export default function AdminUsers() {
  const [q, setQ] = useState('')
  const [f, setF] = useState<(typeof FILTERS)[number]>('All')
  const needle = q.trim().toLowerCase()
  const rows = ADMIN_USERS
    .filter((u) => f === 'All' || (f === 'VIP' ? u.vip : f === 'Has coins' ? u.coins > 0 : u.status === 'Banned'))
    .filter((u) => !needle || `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(needle))
  return (
    <AdminShell>
      <h1>Users</h1>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <label className="search-pill" style={{ flex: '1 1 280px', borderRadius: 12, border: '1.5px solid #3A3340' }}>
          <Icon name="search" size={16} width={2.2} />
          <input type="search" aria-label="Search users" placeholder="Name, email or user ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div role="radiogroup" aria-label="Filter" className="chips">
          {FILTERS.map((x) => <button key={x} type="button" role="radio" aria-checked={f === x} className="chip" onClick={() => setF(x)}>{x}</button>)}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty panel"><h2>No users match</h2><p>Try a different name, email or filter.</p></div>
      ) : (
        <div className="table-box">
          <table className="table" style={{ minWidth: 880 }}>
            <thead><tr><th>User</th><th>Sign-in</th><th>Coins</th><th>VIP</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}/`} className="row" style={{ color: '#FFFFFF', textDecoration: 'none', gap: 10 }}>
                    <Avatar initial={u.initial} color={u.color} size={34} />
                    <span className="stack" style={{ gap: 2, minWidth: 0 }}><span style={{ fontWeight: 600 }}>{u.name}</span><span className="tiny faint">{u.email} · ID {u.id}</span></span>
                  </Link></td>
                  <td className="muted">{u.via}</td>
                  <td>{u.coins.toLocaleString('en-US')}</td>
                  <td style={{ color: u.vip ? 'var(--gold)' : 'var(--text-3)' }}>{u.vip ? `Until ${u.vip}` : '—'}</td>
                  <td className="faint">{u.joined}</td>
                  <td><StatusText value={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
