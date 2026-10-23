'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell, LoadState, useToast } from '@/components/shell'
import { Coin, Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useConfig } from '@/lib/data'
import { shareInvite } from '@/lib/share'
import { checkIn, claimTask, completeAd, startAd, useMe } from '@/lib/store'
import type { Task } from '@/lib/types'

export default function RewardsPage() {
  const { me, error } = useMe()
  const config = useConfig()
  const [toast, show] = useToast()
  const [reward, setReward] = useState<{ amount: number; vipBonus: number } | null>(null)
  const [ad, setAd] = useState<{ ticket: string; left: number } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ad) return
    const t = setTimeout(() => {
      if (ad.left > 1) { setAd({ ...ad, left: ad.left - 1 }); return }
      completeAd(ad.ticket).then(() => show(`+${config.data?.tasks.ad ?? 20} coins`), (e) => show(errorMessage(e))).finally(() => setAd(null))
    }, 1000)
    return () => clearTimeout(t)
  }, [ad, config.data, show])

  if (!me || !config.data) return <AppShell><LoadState error={error || config.error} onRetry={config.reload} /></AppShell>
  const amounts = config.data.checkin
  const can = me.checkin.canCheckIn
  const pos = me.checkin.streak % amounts.length
  // A finished 7-day cycle stays fully ticked for the rest of the day it completed.
  const cycleDone = me.checkin.streak > 0 && pos === 0 && !can

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn() } catch (e) { show(errorMessage(e)) } finally { setBusy(false) }
  }
  const doCheckIn = () => act(async () => { const r = await checkIn(); setReward({ amount: r.amount, vipBonus: r.vipBonus }) })
  const task = (t: Task) => {
    if (t.done) return <span className="btn btn-sm btn-secondary" aria-disabled="true" style={{ minWidth: 72 }}>Done</span>
    const button = (label: string, onClick: () => void) => <button type="button" className="btn btn-sm btn-primary" style={{ minWidth: 72 }} disabled={busy} onClick={onClick}>{label}</button>
    const link = (label: string, href: string) => <Link href={href} className="btn btn-sm btn-primary" style={{ minWidth: 72 }}>{label}</Link>
    switch (t.key) {
      case 'ad': return button('Watch', () => act(async () => { const a = await startAd('reward'); setAd({ ticket: a.ticket, left: a.seconds }) }))
      case 'watch': return t.claimable ? button('Claim', () => act(async () => { await claimTask('watch'); show(`+${t.amount} coins`) })) : link('Go', '/')
      case 'notify': {
        const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted'
        return granted ? button('Claim', () => act(async () => { await claimTask('notify'); show(`+${t.amount} coins`) })) : link('Open', '/settings/notifications/')
      }
      case 'invite': return me.user.signedIn ? button('Invite', () => void shareInvite(show)) : link('Sign in', '/login/')
      case 'signin': return link('Sign in', '/login/')
    }
    return null
  }

  return (
    <AppShell>
      <header className="row between pad" style={{ paddingTop: 16, minHeight: 60 }}>
        <h1 className="page-title">Rewards</h1>
        <Link href="/wallet/" className="chip" style={{ color: '#FFFFFF', fontWeight: 800, gap: 6 }}><Coin />{me.coins}<Icon name="chevron" size={14} width={2.4} style={{ color: 'var(--text-3)' }} /></Link>
      </header>
      <div className="stack gap-24 pad" style={{ paddingTop: 8, maxWidth: 760 }}>
        <section aria-labelledby="ci" className="stack gap-12">
          <div className="row between"><h2 id="ci" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Daily check-in</h2><span className="small" style={{ color: '#FFC46B', fontWeight: 600 }}>{me.checkin.streak}-day streak</span></div>
          <ol className="list" style={{ display: 'grid', gridTemplateColumns: `repeat(${amounts.length}, minmax(0, 1fr))`, gap: 6 }}>
            {amounts.map((amt, i) => {
              const claimed = cycleDone || i < pos
              const isToday = can && i === pos
              return (
                <li key={i} aria-label={`Day ${i + 1}, ${amt} coins${claimed ? ', claimed' : ''}`}
                  style={{ minHeight: 76, borderRadius: 12, background: isToday ? 'var(--accent-soft)' : 'var(--surface)', border: `1.5px solid ${isToday ? '#FF5C7A' : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {claimed ? <Icon name="check" size={20} width={2.6} style={{ color: 'var(--text-3)' }} /> : <Coin size={20} />}
                  <span style={{ fontSize: 12, fontWeight: 800, color: claimed ? 'var(--text-3)' : i === amounts.length - 1 ? '#FFC46B' : '#FFFFFF' }}>+{amt}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{isToday ? 'Today' : `Day ${i + 1}`}</span>
                </li>
              )
            })}
          </ol>
          <button type="button" className="btn btn-primary btn-block" disabled={!can || busy} onClick={doCheckIn}>
            {can ? `Check in · +${me.checkin.nextAmount} coins` : 'Checked in today · come back tomorrow'}
          </button>
          {me.subscription.state === 'active' && config.data.vipBonus > 0 && <span className="small" style={{ color: 'var(--gold)' }}>VIP adds +{config.data.vipBonus} coins to every check-in.</span>}
        </section>

        <section aria-labelledby="tk">
          <h2 id="tk" style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Tasks</h2>
          <ul className="list">
            {me.tasks.map((t) => (
              <li key={t.key} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--surface)' }}>
                <div className="stack" style={{ flex: 1, gap: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</span>
                  <span className="small" style={{ color: '#FFC46B', fontWeight: 600 }}>+{t.amount} coins{t.note && <span className="faint" style={{ fontWeight: 500 }}> · {t.note}</span>}</span>
                </div>
                {task(t)}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {ad && (
        <div className="backdrop center" style={{ background: '#000000' }} role="dialog" aria-modal="true" aria-label="Sponsored video">
          <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span className="tiny faint">Sponsored · demo ad</span>
            <div style={{ width: 220, aspectRatio: '9 / 16', borderRadius: 16, background: '#1E2533', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)', fontWeight: 700 }}>Your ad here</div>
            <span role="status" style={{ fontWeight: 700 }}>Reward in {ad.left}s</span>
          </div>
        </div>
      )}

      {reward && (
        <div className="backdrop center">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ck">
            <Coin size={72} />
            <h2 id="ck" style={{ fontSize: 28, fontWeight: 900, color: '#FFC46B' }}>+{reward.amount + reward.vipBonus} coins</h2>
            <p>{reward.vipBonus ? `Includes your +${reward.vipBonus} VIP bonus. ` : ''}Come back tomorrow for +{me.checkin.nextAmount}.</p>
            <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => setReward(null)}>Collect</button>
          </div>
        </div>
      )}
      {toast}
    </AppShell>
  )
}
