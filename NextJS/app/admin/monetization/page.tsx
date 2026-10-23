'use client'

import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { Switch } from '@/components/ui'
import { AD_UNLOCKS_PER_DAY, CHECKIN_AMOUNTS, COIN_PACKS, VIP_PLANS } from '@/data/dummy'

const num = { background: 'var(--bg)' }

export default function AdminMonetization() {
  const [toast, show] = useToast()
  const [defaults, setDefaults] = useState({ coins: 60, free: 10, ads: AD_UNLOCKS_PER_DAY, vipBonus: 20 })
  const [packs, setPacks] = useState(COIN_PACKS.map((p) => ({ ...p, onSale: true })))
  const [days, setDays] = useState(CHECKIN_AMOUNTS)
  const [tasks, setTasks] = useState([['Watch a short ad', 20], ['Watch 30 minutes in a day', 30], ['Turn on notifications', 20], ['Invite a friend (each side)', 50]] as [string, number][])
  const invalid = Object.values(defaults).some((v) => !Number.isFinite(v) || v < 0) || packs.some((p) => p.coins <= 0 || p.bonus < 0) || days.some((d) => d < 0)

  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Coins, VIP &amp; rewards</h1>
        <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} disabled={invalid} onClick={() => show('Saved (demo, not stored)')}>Save changes</button>
      </div>
      {invalid && <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>Amounts can&apos;t be negative, and every pack needs coins.</p>}

      <section className="panel stack gap-12" aria-labelledby="dp">
        <h2 id="dp" style={{ margin: 0 }}>Episode defaults</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {([['coins', 'Coins per episode'], ['free', 'Free episodes per drama'], ['ads', 'Ad unlocks per user per day'], ['vipBonus', 'VIP daily bonus coins']] as const).map(([k, label]) => (
            <div key={k} className="field"><label htmlFor={k}>{label}</label><input id={k} className="input" type="number" min={0} style={num} value={defaults[k]} onChange={(e) => setDefaults({ ...defaults, [k]: Number(e.target.value) })} /></div>
          ))}
        </div>
      </section>

      <section className="table-box" aria-labelledby="cp">
        <div className="row" style={{ padding: '18px 20px 6px', flexWrap: 'wrap' }}><h2 id="cp" style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 800 }}>Coin packs</h2><span className="tiny faint">Prices are set in Play Console and App Store Connect</span></div>
        <table className="table" style={{ minWidth: 760 }}>
          <thead><tr><th>Store product ID</th><th>Coins</th><th>Bonus</th><th>Badge</th><th>Store price</th><th>On sale</th></tr></thead>
          <tbody>
            {packs.map((p, i) => {
              const set = (patch: Partial<typeof p>) => setPacks(packs.map((x, j) => j === i ? { ...x, ...patch } : x))
              return (
                <tr key={p.id}>
                  <td className="mono">{p.id}</td>
                  <td style={{ width: 110 }}><input className="input" type="number" min={1} aria-label={`Coins for ${p.id}`} style={num} value={p.coins} onChange={(e) => set({ coins: Number(e.target.value) })} /></td>
                  <td style={{ width: 110 }}><input className="input" type="number" min={0} aria-label={`Bonus for ${p.id}`} style={num} value={p.bonus} onChange={(e) => set({ bonus: Number(e.target.value) })} /></td>
                  <td style={{ width: 170 }}><input className="input" aria-label={`Badge for ${p.id}`} style={num} value={p.tag} onChange={(e) => set({ tag: e.target.value })} /></td>
                  <td className="muted">{p.price}</td>
                  <td><Switch label={`${p.id} on sale`} checked={p.onSale} onChange={(v) => set({ onSale: v })} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <div className="two-col">
        <section className="panel main-col" style={{ background: 'var(--gold-bg)', color: 'var(--gold)', gap: 0 }} aria-labelledby="vp">
          <h2 id="vp">VIP plans</h2>
          {VIP_PLANS.map((v) => (
            <div key={v.id} className="row" style={{ minHeight: 44, borderTop: '1px solid #3A2E18', fontSize: 14 }}>
              <strong style={{ flex: 1 }}>{v.name}</strong><span className="mono" style={{ color: '#D9B571' }}>{v.id}</span><span>{v.price}</span>
            </div>
          ))}
        </section>
        <section className="panel side-col" style={{ gap: 12 }} aria-labelledby="ck">
          <h2 id="ck" style={{ margin: 0 }}>Daily check-in (7-day cycle)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
            {days.map((v, i) => (
              <div key={i} className="stack gap-6" style={{ alignItems: 'center' }}>
                <label htmlFor={`d${i}`} className="tiny faint">Day {i + 1}</label>
                <input id={`d${i}`} className="input" type="number" min={0} value={v} onChange={(e) => setDays(days.map((x, j) => j === i ? Number(e.target.value) : x))} style={{ ...num, padding: '0 4px', textAlign: 'center' }} />
              </div>
            ))}
          </div>
          <h3 style={{ margin: '6px 0 0', fontSize: 14 }}>Tasks</h3>
          {tasks.map(([name, v], i) => (
            <div key={name} className="row small"><span style={{ flex: 1 }}>{name}</span>
              <input className="input" type="number" min={0} aria-label={`Coins for ${name}`} value={v} onChange={(e) => setTasks(tasks.map((t, j) => j === i ? [t[0], Number(e.target.value)] : t))} style={{ ...num, width: 90 }} /></div>
          ))}
        </section>
      </div>
      {toast}
    </AdminShell>
  )
}
