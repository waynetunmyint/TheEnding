'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AdminShell, StatusText } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { Avatar } from '@/components/ui'
import { ADMIN_PAYMENTS, ADMIN_USERS } from '@/data/dummy'
import { nowStamp } from '@/lib/demo-store'

const REASONS = ['Refund for playback problem', 'Missing purchase', 'Promotion', 'Correction']

export function AdminUserDetail({ id }: { id: string }) {
  const u = ADMIN_USERS.find((x) => x.id === id)!
  const [toast, show] = useToast()
  const [coins, setCoins] = useState(u.coins)
  const [status, setStatus] = useState(u.status)
  const [amount, setAmount] = useState('100')
  const [reason, setReason] = useState(REASONS[0])
  const [confirmBan, setConfirmBan] = useState(false)
  const [activity, setActivity] = useState([
    { what: 'Daily check-in', when: '23/10/2026', amt: 15 },
    { what: "Unlocked EP 35 · Divorced, Now I'm the CEO", when: '22/10/2026', amt: -50 },
    { what: 'Watched a short ad', when: '22/10/2026', amt: 20 },
    { what: 'Invited a friend', when: '20/10/2026', amt: 50 },
  ])
  const n = Number(amount)
  const validAmount = Number.isInteger(n) && n !== 0 && coins + n >= 0
  const payments = ADMIN_PAYMENTS.filter((p) => p.userId === u.id)

  const adjust = () => {
    if (!validAmount) return
    setCoins(coins + n)
    setActivity([{ what: `Admin adjustment · ${reason}`, when: nowStamp(), amt: n }, ...activity])
    show(`${n > 0 ? 'Added' : 'Removed'} ${Math.abs(n)} coins (demo)`)
  }

  return (
    <AdminShell>
      <nav aria-label="Breadcrumb" className="small faint"><Link href="/admin/users/">Users</Link> / {u.name}</nav>
      <div className="row" style={{ flexWrap: 'wrap', gap: 14 }}>
        <Avatar initial={u.initial} color={u.color} size={56} />
        <div className="stack" style={{ flex: 1, gap: 4 }}>
          <h1>{u.name}</h1>
          <span className="small faint">ID {u.id} · <StatusText value={status} />{u.vip && <span style={{ color: 'var(--gold)' }}> · VIP until {u.vip}</span>}</span>
        </div>
        {status === 'Banned'
          ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setStatus('Active'); show('User unbanned (demo)') }}>Unban user</button>
          : <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmBan(true)}>Ban user</button>}
      </div>

      <div className="two-col">
        <div className="main-col">
          <section className="panel" aria-labelledby="pf">
            <h2 id="pf">Profile</h2>
            <dl style={{ margin: 0 }}>
              {[['Email', u.email], ['Sign-in method', u.via], ['Joined', u.joined], ['Coins', coins.toLocaleString('en-US')]].map(([k, v]) => (
                <div key={k} className="row between" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)', fontSize: 14 }}><dt className="faint">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>
              ))}
            </dl>
          </section>
          <section className="panel" aria-labelledby="tx">
            <h2 id="tx">Recent coin activity</h2>
            {activity.map((a, i) => (
              <div key={i} className="row" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)', fontSize: 14 }}>
                <span style={{ flex: 1 }}>{a.what}</span><span className="small faint">{a.when}</span>
                <span style={{ width: 64, textAlign: 'right', fontWeight: 700, color: a.amt > 0 ? '#FFC46B' : 'var(--text-2)' }}>{a.amt > 0 ? '+' : '−'}{Math.abs(a.amt)}</span>
              </div>
            ))}
          </section>
          {payments.length > 0 && (
            <section className="panel" aria-labelledby="py">
              <h2 id="py">Payments</h2>
              {payments.map((p) => (
                <div key={p.order} className="row" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)', fontSize: 14, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1 }}>{p.item} · {p.store}</span><span className="small faint">{p.when}</span><span style={{ fontWeight: 700 }}>{p.amount}</span><StatusText value={p.status} />
                </div>
              ))}
            </section>
          )}
        </div>
        <aside className="side-col">
          <form className="panel stack gap-12" aria-labelledby="ad" onSubmit={(e) => { e.preventDefault(); adjust() }}>
            <h2 id="ad" style={{ margin: 0 }}>Adjust coins</h2>
            <span className="small muted">Balance: {coins.toLocaleString('en-US')} coins</span>
            <div className="field"><label htmlFor="amt">Amount (use − to remove)</label><input id="amt" className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ background: 'var(--bg)' }} /></div>
            {!validAmount && amount !== '' && <span role="alert" className="tiny" style={{ color: 'var(--bad)' }}>Enter a whole number that keeps the balance at 0 or more.</span>}
            <div className="field"><label htmlFor="rs">Reason (shown in the user&apos;s Wallet)</label>
              <select id="rs" className="input" value={reason} onChange={(e) => setReason(e.target.value)} style={{ background: 'var(--bg)' }}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
            <button type="submit" className="btn btn-primary btn-block" disabled={!validAmount}>{n < 0 ? `Remove ${Math.abs(n) || ''} coins` : `Add ${n || ''} coins`}</button>
            <span className="tiny faint">Logged with your name in the audit log.</span>
          </form>
          {u.vip && (
            <section className="panel stack gap-6" style={{ background: 'var(--gold-bg)', color: 'var(--gold)' }} aria-labelledby="sb">
              <h2 id="sb" style={{ margin: 0 }}>VIP subscription</h2>
              <span className="small">Renews {u.vip}</span>
              <span className="tiny" style={{ color: '#D9B571' }}>Cancel or refund in Play Console or App Store Connect.</span>
            </section>
          )}
        </aside>
      </div>

      {confirmBan && (
        <div className="backdrop center">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="bn">
            <h2 id="bn">Ban {u.name}?</h2>
            <p>They are signed out everywhere and can&apos;t comment or sign in. Their purchases are kept.</p>
            <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={() => { setStatus('Banned'); setConfirmBan(false); show('User banned (demo)') }}>Ban user</button>
            <button type="button" className="btn btn-ghost btn-block" style={{ color: '#FFFFFF' }} onClick={() => setConfirmBan(false)}>Cancel</button>
          </div>
        </div>
      )}
      {toast}
    </AdminShell>
  )
}
