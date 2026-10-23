'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, useHydrated } from '@/components/shell'
import { Coin, Icon } from '@/components/ui'
import { CHECKIN_AMOUNTS } from '@/data/dummy'
import { adsLeft, canCheckIn, checkIn, nextCheckinAmount, useDemo } from '@/lib/demo-store'

export default function RewardsPage() {
  const s = useDemo()
  const hydrated = useHydrated()
  const [reward, setReward] = useState(0)
  const can = canCheckIn(s)
  const pos = s.checkin.streak % CHECKIN_AMOUNTS.length
  // A finished 7-day cycle stays fully ticked for the rest of the day it completed.
  const cycleDone = s.checkin.streak > 0 && pos === 0 && !can
  const tasks = [
    { name: 'Watch a short ad', amount: 20, note: ` · ${3 - adsLeft(s)}/3 today`, cta: 'Watch', href: '/watch/contract-bride/?ep=11', done: adsLeft(s) === 0 },
    { name: 'Watch 30 minutes today', amount: 30, note: '', cta: 'Go', href: '/shorts/', done: false },
    { name: 'Turn on notifications', amount: 20, note: '', cta: 'Open', href: '/settings/notifications/', done: false },
    { name: 'Invite a friend', amount: 50, note: '', cta: 'Invite', href: '/drama/contract-bride/', done: false },
    { name: 'Sign in with Google or email', amount: 30, note: '', cta: s.signedIn ? 'Done' : 'Sign in', href: '/login/', done: s.signedIn },
  ]
  return (
    <AppShell>
      <header className="row between pad" style={{ paddingTop: 16, minHeight: 60 }}>
        <h1 className="page-title">Rewards</h1>
        <Link href="/wallet/" className="chip" style={{ color: '#FFFFFF', fontWeight: 800, gap: 6 }}><Coin />{hydrated ? s.coins : '—'}<Icon name="chevron" size={14} width={2.4} style={{ color: 'var(--text-3)' }} /></Link>
      </header>
      <div className="stack gap-24 pad" style={{ paddingTop: 8, maxWidth: 760 }}>
        <section aria-labelledby="ci" className="stack gap-12">
          <div className="row between"><h2 id="ci" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Daily check-in</h2><span className="small" style={{ color: '#FFC46B', fontWeight: 600 }}>{s.checkin.streak}-day streak</span></div>
          <ol className="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
            {CHECKIN_AMOUNTS.map((amt, i) => {
              const claimed = cycleDone || i < pos
              const isToday = can && i === pos
              return (
                <li key={i} aria-label={`Day ${i + 1}, ${amt} coins${claimed ? ', claimed' : ''}`}
                  style={{ minHeight: 76, borderRadius: 12, background: isToday ? 'var(--accent-soft)' : 'var(--surface)', border: `1.5px solid ${isToday ? '#FF5C7A' : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {claimed ? <Icon name="check" size={20} width={2.6} style={{ color: 'var(--text-3)' }} /> : <Coin size={20} />}
                  <span style={{ fontSize: 12, fontWeight: 800, color: claimed ? 'var(--text-3)' : i === 6 ? '#FFC46B' : '#FFFFFF' }}>+{amt}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{isToday ? 'Today' : `Day ${i + 1}`}</span>
                </li>
              )
            })}
          </ol>
          <button type="button" className="btn btn-primary btn-block" disabled={!hydrated || !can} onClick={() => setReward(checkIn())}>
            {can ? `Check in · +${nextCheckinAmount(s)} coins` : 'Checked in today · come back tomorrow'}
          </button>
        </section>

        <section aria-labelledby="tk">
          <h2 id="tk" style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Tasks</h2>
          <ul className="list">
            {tasks.map((t) => (
              <li key={t.name} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--surface)' }}>
                <div className="stack" style={{ flex: 1, gap: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</span>
                  <span className="small" style={{ color: '#FFC46B', fontWeight: 600 }}>+{t.amount} coins{t.note && <span className="faint" style={{ fontWeight: 500 }}>{t.note}</span>}</span>
                </div>
                {t.done
                  ? <span className="btn btn-sm btn-secondary" aria-disabled="true" style={{ minWidth: 72 }}>Done</span>
                  : <Link href={t.href} className="btn btn-sm btn-primary" style={{ minWidth: 72 }}>{t.cta}</Link>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {reward > 0 && (
        <div className="backdrop center">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ck">
            <Coin size={72} />
            <h2 id="ck" style={{ fontSize: 28, fontWeight: 900, color: '#FFC46B' }}>+{reward} coins</h2>
            <p>Checked in. Come back tomorrow for +{nextCheckinAmount(s)}.</p>
            <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => setReward(0)}>Collect</button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
