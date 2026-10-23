'use client'

import { useState } from 'react'
import { AdminShell, RoleNote, useAdmin } from '@/components/admin-shell'
import { LoadState, useToast } from '@/components/shell'
import { Switch } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { invalidate, setData, useApi } from '@/lib/data'
import { price } from '@/lib/format'
import type { AppConfig } from '@/lib/types'

const num = { background: 'var(--bg)' }

function Editor({ initial, show }: { initial: AppConfig; show: (m: string) => void }) {
  const admin = useAdmin()
  const can = admin.can('settings')
  const [c, setC] = useState(initial)
  const [busy, setBusy] = useState(false)
  const invalid = [c.coinsPerEpisode, c.freeEpisodes, c.adsPerDay, c.vipBonus, c.welcomeCoins, ...Object.values(c.tasks), ...c.checkin].some((v) => !Number.isFinite(v) || v < 0)
    || c.coinPacks.some((p) => p.coins <= 0 || p.bonus < 0)
  const dirty = JSON.stringify(c) !== JSON.stringify(initial)
  const save = async () => {
    setBusy(true)
    try {
      const saved = await api<AppConfig>('/admin/monetization', { method: 'PUT', body: c })
      setData('/admin/monetization', saved)
      invalidate('/config')
      show('Saved')
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const field = (k: 'coinsPerEpisode' | 'freeEpisodes' | 'adsPerDay' | 'vipBonus' | 'welcomeCoins', label: string, hint?: string) => (
    <div key={k} className="field"><label htmlFor={k}>{label}</label><input id={k} className="input" type="number" min={0} style={num} value={c[k]} onChange={(e) => setC({ ...c, [k]: Number(e.target.value) })} />{hint && <span className="tiny faint">{hint}</span>}</div>
  )
  const tasks: [keyof AppConfig['tasks'], string][] = [['ad', 'Watch a short ad'], ['watch', 'Watch 30 minutes in a day'], ['notify', 'Turn on notifications'], ['invite', 'Invite a friend (each side)'], ['signin', 'First sign-in']]

  return (
    <>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Coins, VIP &amp; rewards</h1>
        {can && <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} disabled={invalid || !dirty || busy} onClick={save}>Save changes</button>}
      </div>
      <RoleNote perm="settings" admin={admin} />
      {invalid && <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>Amounts can&apos;t be negative, and every pack needs coins.</p>}

      <fieldset disabled={!can} style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section className="panel stack gap-12" aria-labelledby="dp">
          <h2 id="dp" style={{ margin: 0 }}>Defaults</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {field('coinsPerEpisode', 'Coins per episode', 'For new dramas')}
            {field('freeEpisodes', 'Free episodes per drama', 'For new dramas')}
            {field('adsPerDay', 'Ad unlocks per user per day')}
            {field('vipBonus', 'VIP check-in bonus coins')}
            {field('welcomeCoins', 'Welcome coins for new accounts')}
          </div>
        </section>

        <section className="table-box" aria-labelledby="cp">
          <div className="row" style={{ padding: '18px 20px 6px', flexWrap: 'wrap' }}><h2 id="cp" style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 800 }}>Coin packs</h2><span className="tiny faint">Prices are set in Play Console and App Store Connect</span></div>
          <table className="table" style={{ minWidth: 760 }}>
            <thead><tr><th>Store product ID</th><th>Coins</th><th>Bonus</th><th>Badge</th><th>Store price</th><th>On sale</th></tr></thead>
            <tbody>
              {c.coinPacks.map((p, i) => {
                const set = (patch: Partial<typeof p>) => setC({ ...c, coinPacks: c.coinPacks.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
                return (
                  <tr key={p.id}>
                    <td className="mono">{p.id}</td>
                    <td style={{ width: 110 }}><input className="input" type="number" min={1} aria-label={`Coins for ${p.id}`} style={num} value={p.coins} onChange={(e) => set({ coins: Number(e.target.value) })} /></td>
                    <td style={{ width: 110 }}><input className="input" type="number" min={0} aria-label={`Bonus for ${p.id}`} style={num} value={p.bonus} onChange={(e) => set({ bonus: Number(e.target.value) })} /></td>
                    <td style={{ width: 170 }}><input className="input" aria-label={`Badge for ${p.id}`} style={num} maxLength={20} value={p.tag} onChange={(e) => set({ tag: e.target.value })} /></td>
                    <td className="muted">{price(p.priceCents)}</td>
                    <td><Switch label={`${p.id} on sale`} checked={p.onSale} disabled={!can} onChange={(v) => set({ onSale: v })} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <div className="two-col">
          <section className="panel main-col" style={{ background: 'var(--gold-bg)', color: 'var(--gold)', gap: 0 }} aria-labelledby="vp">
            <h2 id="vp">VIP plans</h2>
            {c.vipPlans.map((v) => (
              <div key={v.id} className="row" style={{ minHeight: 44, borderTop: '1px solid #3A2E18', fontSize: 14 }}>
                <strong style={{ flex: 1 }}>{v.name}</strong><span className="mono" style={{ color: '#D9B571' }}>{v.id}</span><span>{v.days} days</span><span>{price(v.priceCents)}</span>
              </div>
            ))}
            <span className="tiny" style={{ color: '#D9B571', paddingTop: 10 }}>Plans and prices live in the stores.</span>
          </section>
          <section className="panel side-col" style={{ gap: 12 }} aria-labelledby="ck">
            <h2 id="ck" style={{ margin: 0 }}>Daily check-in (7-day cycle)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
              {c.checkin.map((v, i) => (
                <div key={i} className="stack gap-6" style={{ alignItems: 'center' }}>
                  <label htmlFor={`d${i}`} className="tiny faint">Day {i + 1}</label>
                  <input id={`d${i}`} className="input" type="number" min={0} value={v} onChange={(e) => setC({ ...c, checkin: c.checkin.map((x, j) => (j === i ? Number(e.target.value) : x)) })} style={{ ...num, padding: '0 4px', textAlign: 'center' }} />
                </div>
              ))}
            </div>
            <h3 style={{ margin: '6px 0 0', fontSize: 14 }}>Tasks</h3>
            {tasks.map(([k, name]) => (
              <div key={k} className="row small"><span style={{ flex: 1 }}>{name}</span>
                <input className="input" type="number" min={0} aria-label={`Coins for ${name}`} value={c.tasks[k]} onChange={(e) => setC({ ...c, tasks: { ...c.tasks, [k]: Number(e.target.value) } })} style={{ ...num, width: 90 }} /></div>
            ))}
          </section>
        </div>
      </fieldset>
    </>
  )
}

export default function AdminMonetization() {
  const q = useApi<AppConfig>('/admin/monetization')
  const [toast, show] = useToast()
  return <AdminShell>{q.data ? <Editor key={JSON.stringify(q.data)} initial={q.data} show={show} /> : <LoadState error={q.error} onRetry={q.reload} />}{toast}</AdminShell>
}
