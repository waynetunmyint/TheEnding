'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppShell, RequireSignIn, TopBar } from '@/components/shell'
import { Coin, CrownIcon, Icon } from '@/components/ui'

const ITEMS = [
  { id: 1, kind: 'ep', title: 'EP 36 is out', body: "Divorced, Now I'm the CEO has a new episode.", when: '23/10/2026 · 8:00 AM', href: '/watch/divorced-ceo/?ep=36' },
  { id: 2, kind: 'coin', title: 'Your daily coins are ready', body: 'Check in today for free coins.', when: '23/10/2026 · 7:00 AM', href: '/rewards/' },
  { id: 3, kind: 'vip', title: 'VIP deal this weekend', body: 'Monthly VIP, every episode unlocked.', when: '22/10/2026 · 12:01 PM', href: '/vip/' },
  { id: 4, kind: 'ep', title: 'Coming soon: The Duke Who Married a Maid', body: 'Premieres 25/10/2026. You set a reminder.', when: '22/10/2026 · 6:00 PM', href: '/new/' },
  { id: 5, kind: 'sys', title: 'New sign-in', body: 'Signed in on a new browser. Not you? Sign out of other devices.', when: '20/10/2026 · 9:14 PM', href: '/settings/' },
]

function Inbox() {
  const [unread, setUnread] = useState<number[]>([1, 2])
  const [cleared, setCleared] = useState(false)
  const items = cleared ? [] : ITEMS
  return (
    <>
      <TopBar title="Notifications" back="/me/" right={items.length ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUnread([])}>Read all</button> : undefined} />
      {items.length === 0 ? (
        <div className="empty">
          <div className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}><Icon name="bell" size={30} /></div>
          <h2>All caught up</h2>
          <p>New episodes and rewards will show up here.</p>
        </div>
      ) : (
        <ul className="list pad narrow">
          {items.map((n) => {
            const isUnread = unread.includes(n.id)
            return (
              <li key={n.id}>
                <Link href={n.href} onClick={() => setUnread(unread.filter((x) => x !== n.id))} className="row" style={{ alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--surface)', color: '#FFFFFF', textDecoration: 'none' }}>
                  <span className="icon-circle" style={{ width: 40, height: 40, background: n.kind === 'ep' ? 'var(--accent-soft)' : n.kind === 'sys' ? 'var(--surface)' : 'var(--gold-bg)', color: n.kind === 'sys' ? 'var(--text-2)' : 'var(--accent)' }}>
                    {n.kind === 'ep' && <Icon name="shorts" size={20} />}{n.kind === 'coin' && <Coin size={20} />}{n.kind === 'vip' && <CrownIcon size={20} />}{n.kind === 'sys' && <Icon name="bell" size={20} />}
                  </span>
                  <span className="stack" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: isUnread ? 700 : 500 }}>{n.title}</span>
                    <span className="small muted" style={{ lineHeight: 1.4 }}>{n.body}</span>
                    <span className="tiny faint">{n.when}</span>
                  </span>
                  {isUnread && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: 4, background: '#FF3D5E', marginTop: 6, flex: 'none' }} />}
                </Link>
              </li>
            )
          })}
          <li><button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setCleared(true)}>Clear all</button></li>
        </ul>
      )}
    </>
  )
}

export default function InboxPage() {
  return <AppShell tabs={false}><RequireSignIn><Inbox /></RequireSignIn></AppShell>
}
