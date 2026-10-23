'use client'

import Link from 'next/link'
import { AppShell, LoadState, RequireSignIn, TopBar, useToast } from '@/components/shell'
import { Coin, CrownIcon, Icon } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useApi } from '@/lib/data'
import { fmtStamp } from '@/lib/format'
import { boot, useMe } from '@/lib/store'
import type { InboxItem } from '@/lib/types'

function Inbox() {
  const { me } = useMe()
  const q = useApi<InboxItem[]>(`/inbox?u=${me!.user.id}`)
  const [toast, show] = useToast()
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await Promise.all([q.reload(), boot(true)]) // refresh the unread badge
    } catch (e) {
      show(errorMessage(e))
    }
  }
  const items = q.data ?? []
  const unread = items.some((n) => !n.read)
  return (
    <>
      <TopBar title="Notifications" back="/me/" right={unread ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api('/inbox/read', { method: 'POST', body: { id: 0 } }))}>Read all</button> : undefined} />
      {!q.data ? <LoadState error={q.error} onRetry={q.reload} /> : items.length === 0 ? (
        <div className="empty">
          <div className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}><Icon name="bell" size={30} /></div>
          <h2>All caught up</h2>
          <p>New episodes and rewards will show up here.</p>
        </div>
      ) : (
        <ul className="list pad narrow">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.href || '/'} onClick={() => { if (!n.read) void api('/inbox/read', { method: 'POST', body: { id: n.id } }).then(() => boot(true)) }} className="row" style={{ alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--surface)', color: '#FFFFFF', textDecoration: 'none' }}>
                <span className="icon-circle" style={{ width: 40, height: 40, background: n.kind === 'ep' ? 'var(--accent-soft)' : n.kind === 'sys' ? 'var(--surface)' : 'var(--gold-bg)', color: n.kind === 'sys' ? 'var(--text-2)' : 'var(--accent)' }}>
                  {n.kind === 'ep' && <Icon name="shorts" size={20} />}{n.kind === 'coin' && <Coin size={20} />}{n.kind === 'vip' && <CrownIcon size={20} />}{n.kind === 'sys' && <Icon name="bell" size={20} />}
                </span>
                <span className="stack" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: n.read ? 500 : 700 }}>{n.title}</span>
                  {n.body && <span className="small muted" style={{ lineHeight: 1.4 }}>{n.body}</span>}
                  <span className="tiny faint">{fmtStamp(n.at)}</span>
                </span>
                {!n.read && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: 4, background: '#FF3D5E', marginTop: 6, flex: 'none' }} />}
              </Link>
            </li>
          ))}
          <li><button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => act(() => api('/inbox', { method: 'DELETE' }))}>Clear all</button></li>
        </ul>
      )}
      {toast}
    </>
  )
}

export default function InboxPage() {
  return <AppShell tabs={false}><RequireSignIn><Inbox /></RequireSignIn></AppShell>
}
