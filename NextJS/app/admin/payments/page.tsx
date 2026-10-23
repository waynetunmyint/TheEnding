'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell, StatusText } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { ADMIN_PAYMENTS } from '@/data/dummy'

const STATUSES = ['All', 'Paid', 'Pending', 'Failed', 'Refunded'] as const

export default function AdminPayments() {
  const [toast, show] = useToast()
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All')
  const [kind, setKind] = useState('Coins and VIP')
  const [store, setStore] = useState('All stores')
  const [rows, setRows] = useState(ADMIN_PAYMENTS.map((p) => ({ ...p, status: p.status as string })))
  const shown = rows
    .filter((p) => status === 'All' || p.status === status)
    .filter((p) => kind === 'Coins and VIP' || (kind === 'Coins only' ? p.kind === 'Coins' : p.kind === 'VIP'))
    .filter((p) => store === 'All stores' || p.store === store)

  const exportCsv = () => {
    const head = 'Date,User,Item,Store,Amount,Status,Order'
    const body = shown.map((p) => [p.when, p.user, p.item, p.store, p.amount, p.status, p.order].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const url = URL.createObjectURL(new Blob([[head, ...body].join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'the-ending-payments-demo.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Payments</h1>
        <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: 40 }} onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div role="radiogroup" aria-label="Status" className="chips">
          {STATUSES.map((s) => <button key={s} type="button" role="radio" aria-checked={status === s} className="chip" onClick={() => setStatus(s)}>{s}</button>)}
        </div>
        <select aria-label="Product" className="input" style={{ width: 'auto', minHeight: 40 }} value={kind} onChange={(e) => setKind(e.target.value)}><option>Coins and VIP</option><option>Coins only</option><option>VIP only</option></select>
        <select aria-label="Store" className="input" style={{ width: 'auto', minHeight: 40 }} value={store} onChange={(e) => setStore(e.target.value)}><option>All stores</option><option>Google Play</option><option>App Store</option></select>
      </div>
      {shown.length === 0 ? (
        <div className="empty panel"><h2>No payments match</h2><p>Try another status, product or store.</p></div>
      ) : (
        <div className="table-box">
          <table className="table" style={{ minWidth: 940 }}>
            <thead><tr><th>Date</th><th>User</th><th>Item</th><th>Store</th><th>Amount</th><th>Status</th><th>Order</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.order}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{p.when}</td>
                  <td><Link href={`/admin/users/${p.userId}/`} style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'none' }}>{p.user}</Link></td>
                  <td>{p.item}</td>
                  <td className="muted">{p.store}</td>
                  <td style={{ fontWeight: 700 }}>{p.amount}</td>
                  <td><StatusText value={p.status} /></td>
                  <td className="mono faint">{p.order}</td>
                  <td style={{ textAlign: 'right' }}>
                    {p.status === 'Pending' && <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: 30 }} onClick={() => { setRows((rs) => rs.map((r) => r.order === p.order ? { ...r, status: 'Paid' } : r)); show(`${p.order} confirmed by the store (demo)`) }}>Recheck</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="tiny faint" style={{ margin: 0, lineHeight: 1.5 }}>Every purchase is verified with Google Play or the App Store on the server before coins or VIP are granted. Refunds are made in the store consoles and sync back here.</p>
      {toast}
    </AdminShell>
  )
}
