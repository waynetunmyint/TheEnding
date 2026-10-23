'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell, EmptyPanel, StatusText, useAdmin } from '@/components/admin-shell'
import { LoadState, useToast } from '@/components/shell'
import { api, errorMessage } from '@/lib/api'
import { invalidate, useApi } from '@/lib/data'
import { fmtStamp, price } from '@/lib/format'
import type { Payment } from '@/lib/types'

const STATUSES = ['All', 'Paid', 'Pending', 'Failed', 'Refunded'] as const

export default function AdminPayments() {
  const admin = useAdmin()
  const [toast, show] = useToast()
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All')
  const [kind, setKind] = useState('')
  const [store, setStore] = useState('All stores')
  const q = useApi<{ payments: Payment[]; stores: string[] }>(`/admin/payments?status=${status}&kind=${kind}&store=${encodeURIComponent(store)}`)
  const rows = q.data?.payments ?? []

  const recheck = async (order: string) => {
    try {
      await api(`/admin/payments/${encodeURIComponent(order)}/recheck`, { method: 'POST' })
      invalidate('/admin/')
      show(`${order} confirmed by the store`)
    } catch (e) {
      show(errorMessage(e))
    }
  }

  const exportCsv = () => {
    const head = 'Date,User ID,User,Item,Store,Amount,Status,Order'
    const body = rows.map((p) => [fmtStamp(p.at), p.userId, p.user, p.item, p.store, price(p.amountCents), p.status, p.order].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const url = URL.createObjectURL(new Blob([[head, ...body].join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'the-ending-payments.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Payments</h1>
        <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: 40 }} onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div role="radiogroup" aria-label="Status" className="chips">
          {STATUSES.map((s) => <button key={s} type="button" role="radio" aria-checked={status === s} className="chip" onClick={() => setStatus(s)}>{s}</button>)}
        </div>
        <select aria-label="Product" className="input" style={{ width: 'auto', minHeight: 40 }} value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Coins and VIP</option><option value="Coins">Coins only</option><option value="VIP">VIP only</option></select>
        <select aria-label="Store" className="input" style={{ width: 'auto', minHeight: 40 }} value={store} onChange={(e) => setStore(e.target.value)}><option>All stores</option>{(q.data?.stores ?? []).map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      {!q.data ? <LoadState error={q.error} onRetry={q.reload} /> : rows.length === 0 ? (
        <EmptyPanel title="No payments match" body="Try another status, product or store." icon="gift" />
      ) : (
        <div className="table-box">
          <table className="table" style={{ minWidth: 940 }}>
            <thead><tr><th>Date</th><th>User</th><th>Item</th><th>Store</th><th>Amount</th><th>Status</th><th>Order</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.order}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtStamp(p.at)}</td>
                  <td><Link href={`/admin/users/${p.userId}/`} style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'none' }}>{p.user}</Link></td>
                  <td>{p.item}</td>
                  <td className="muted">{p.store}</td>
                  <td style={{ fontWeight: 700 }}>{price(p.amountCents)}</td>
                  <td><StatusText value={p.status} /></td>
                  <td className="mono faint">{p.order}</td>
                  <td style={{ textAlign: 'right' }}>
                    {p.status === 'Pending' && admin.can('payments') && <button type="button" className="btn btn-secondary btn-sm" style={{ minHeight: 30 }} onClick={() => recheck(p.order)}>Recheck</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="tiny faint" style={{ margin: 0, lineHeight: 1.5 }}>Showing the latest 500. In the apps every purchase is verified with Google Play or the App Store before coins or VIP are granted; web orders here come from the demo checkout. Recheck asks the store again and grants the order when it clears.</p>
      {toast}
    </AdminShell>
  )
}
