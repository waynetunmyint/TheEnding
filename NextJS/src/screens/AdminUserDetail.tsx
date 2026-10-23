'use client'

import { useState } from 'react'
import { AdminShell, Breadcrumb, RoleNote, StatusText, useAdmin } from '@/components/admin-shell'
import { LoadState, useRouteId, useToast } from '@/components/shell'
import { Avatar } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { setData, useApi } from '@/lib/data'
import { fmtDate, fmtStamp, price } from '@/lib/format'
import type { AdminUser, Payment, WalletEntry } from '@/lib/types'

type Data = { user: AdminUser; activity: WalletEntry[]; payments: Payment[]; unlocks: number; comments: number }
const REASONS = ['Refund for playback problem', 'Missing purchase', 'Promotion', 'Correction']

export function AdminUserDetail() {
  const id = useRouteId(2)
  const path = id && id !== '_' ? `/admin/users/${encodeURIComponent(id)}` : null
  const q = useApi<Data>(path)
  const admin = useAdmin()
  const [toast, show] = useToast()
  const [amount, setAmount] = useState('100')
  const [reason, setReason] = useState(REASONS[0])
  const [confirmBan, setConfirmBan] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!q.data) return <AdminShell><LoadState error={q.error} onRetry={q.reload} /></AdminShell>
  const { user: u, activity, payments } = q.data
  const n = Number(amount)
  const validAmount = Number.isInteger(n) && n !== 0 && Math.abs(n) <= 100000 && u.coins + n >= 0
  const can = admin.can('users')

  const send = async (url: string, body: unknown, msg: string) => {
    setBusy(true)
    try {
      setData(path!, await api<Data>(url, { method: 'POST', body }))
      show(msg)
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
      setConfirmBan(false)
    }
  }

  return (
    <AdminShell>
      <Breadcrumb parent="Users" href="/admin/users/" current={u.name} />
      <div className="row" style={{ flexWrap: 'wrap', gap: 14 }}>
        <Avatar initial={u.initial} color={u.color} size={56} />
        <div className="stack" style={{ flex: 1, gap: 4 }}>
          <h1>{u.name}</h1>
          <span className="small faint">ID {u.id} · <StatusText value={u.status} />{u.role && <> · {u.role}</>}{u.vipUntil > 0 && <span style={{ color: 'var(--gold)' }}> · VIP until {fmtDate(u.vipUntil)}</span>}{u.mutedUntil > 0 && <> · muted until {fmtDate(u.mutedUntil)}</>}</span>
        </div>
        {can && !u.role && u.status !== 'Deleted' && (u.status === 'Banned'
          ? <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => send(`/admin/users/${u.id}/ban`, { banned: false }, 'User unbanned')}>Unban user</button>
          : <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmBan(true)}>Ban user</button>)}
      </div>

      <div className="two-col">
        <div className="main-col">
          <section className="panel" aria-labelledby="pf">
            <h2 id="pf">Profile</h2>
            <dl style={{ margin: 0 }}>
              {[['Email', u.email], ['Sign-in method', u.via], ['Joined', fmtDate(u.joined)], ['Last seen', fmtStamp(u.lastSeen)], ['Coins', u.coins.toLocaleString('en-US')],
                ['Episodes unlocked', q.data.unlocks.toLocaleString('en-US')], ['Comments', q.data.comments.toLocaleString('en-US')]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="row between" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)', fontSize: 14 }}><dt className="faint">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>
              ))}
            </dl>
          </section>
          <section className="panel" aria-labelledby="tx">
            <h2 id="tx">Recent coin activity</h2>
            {activity.length === 0 && <span className="small faint">No coin activity yet.</span>}
            {activity.map((a, i) => (
              <div key={i} className="row" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)', fontSize: 14 }}>
                <span style={{ flex: 1 }}>{a.what}</span><span className="small faint">{fmtStamp(a.at)}</span>
                <span style={{ width: 64, textAlign: 'right', fontWeight: 700, color: a.amount > 0 ? '#FFC46B' : 'var(--text-2)' }}>{a.amount > 0 ? '+' : '−'}{Math.abs(a.amount)}</span>
              </div>
            ))}
          </section>
          {payments.length > 0 && (
            <section className="panel" aria-labelledby="py">
              <h2 id="py">Payments</h2>
              {payments.map((p) => (
                <div key={p.order} className="row" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)', fontSize: 14, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1 }}>{p.item} · {p.store}</span><span className="small faint">{fmtStamp(p.at)}</span><span style={{ fontWeight: 700 }}>{price(p.amountCents)}</span><StatusText value={p.status} />
                </div>
              ))}
            </section>
          )}
        </div>
        <aside className="side-col">
          <form className="panel stack gap-12" aria-labelledby="ad" onSubmit={(e) => { e.preventDefault(); if (validAmount) void send(`/admin/users/${u.id}/coins`, { amount: n, reason }, `${n > 0 ? 'Added' : 'Removed'} ${Math.abs(n)} coins`) }}>
            <h2 id="ad" style={{ margin: 0 }}>Adjust coins</h2>
            <RoleNote perm="users" admin={admin} />
            <fieldset disabled={!can || u.status === 'Deleted'} style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="small muted">Balance: {u.coins.toLocaleString('en-US')} coins</span>
              <div className="field"><label htmlFor="amt">Amount (use − to remove)</label><input id="amt" className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ background: 'var(--bg)' }} /></div>
              {!validAmount && amount !== '' && <span role="alert" className="tiny" style={{ color: 'var(--bad)' }}>Enter a whole number up to 100,000 that keeps the balance at 0 or more.</span>}
              <div className="field"><label htmlFor="rs">Reason (shown in the user&apos;s Wallet)</label>
                <select id="rs" className="input" value={reason} onChange={(e) => setReason(e.target.value)} style={{ background: 'var(--bg)' }}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
              <button type="submit" className="btn btn-primary btn-block" disabled={!validAmount || busy}>{n < 0 ? `Remove ${Math.abs(n) || ''} coins` : `Add ${n || ''} coins`}</button>
              <span className="tiny faint">Logged with your name in the audit log.</span>
            </fieldset>
          </form>
          {u.vipUntil > 0 && (
            <section className="panel stack gap-6" style={{ background: 'var(--gold-bg)', color: 'var(--gold)' }} aria-labelledby="sb">
              <h2 id="sb" style={{ margin: 0 }}>VIP subscription</h2>
              <span className="small">{u.vipPlan} · until {fmtDate(u.vipUntil)}</span>
              <span className="tiny" style={{ color: '#D9B571' }}>Store subscriptions are cancelled or refunded in Play Console or App Store Connect.</span>
            </section>
          )}
        </aside>
      </div>

      {confirmBan && (
        <div className="backdrop center">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="bn">
            <h2 id="bn">Ban {u.name}?</h2>
            <p>They are signed out everywhere and can&apos;t comment or sign in. Their purchases are kept.</p>
            <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 10 }} disabled={busy} onClick={() => send(`/admin/users/${u.id}/ban`, { banned: true }, 'User banned')}>Ban user</button>
            <button type="button" className="btn btn-ghost btn-block" style={{ color: '#FFFFFF' }} onClick={() => setConfirmBan(false)}>Cancel</button>
          </div>
        </div>
      )}
      {toast}
    </AdminShell>
  )
}
