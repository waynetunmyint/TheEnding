'use client'

import { useState } from 'react'
import { AdminShell, RoleNote, StatusText, useAdmin } from '@/components/admin-shell'
import { LoadState, useToast } from '@/components/shell'
import { api, errorMessage } from '@/lib/api'
import { setData, useApi, useCatalog } from '@/lib/data'
import { fmtStamp, fromLocalInput } from '@/lib/format'
import type { Campaign } from '@/lib/types'

const AUDIENCES = [['Everyone', 'Everyone'], ['Followers', 'Followers of a drama'], ['VIP', 'VIP'], ['Not VIP', 'Not VIP'], ['User', 'One user']] as const

export default function AdminNotifications() {
  const admin = useAdmin()
  const can = admin.can('notify')
  const cat = useCatalog()
  const history = useApi<Campaign[]>('/admin/notifications')
  const [toast, show] = useToast()
  const [aud, setAud] = useState<(typeof AUDIENCES)[number][0]>('Everyone')
  const [drama, setDrama] = useState('')
  const [userId, setUserId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [when, setWhen] = useState<'Send now' | 'Schedule'>('Send now')
  const [at, setAt] = useState('')
  const [busy, setBusy] = useState(false)
  const dramaId = drama || cat.published[0]?.id || ''
  const d = cat.get(dramaId)
  const sendAt = when === 'Schedule' ? fromLocalInput(at) : 0
  const valid = title.trim() && body.trim() && (aud !== 'User' || /^\d{6,}$/.test(userId)) && (aud !== 'Followers' || dramaId) && (when === 'Send now' || sendAt > 0)
  const payload = { title: title.trim(), body: body.trim(), audience: aud, dramaId: aud === 'Followers' ? dramaId : '', userId: aud === 'User' ? Number(userId) : 0, sendAt }

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    try {
      setData('/admin/notifications', await api<Campaign[]>('/admin/notifications', { method: 'POST', body: payload }))
      show(when === 'Send now' ? 'Sent to inboxes' : 'Scheduled')
      setTitle('')
      setBody('')
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const test = () => api('/admin/notifications/test', { method: 'POST', body: payload }).then(() => show('Test sent to your inbox'), (e) => show(errorMessage(e)))
  const cancel = (c: Campaign) => api<Campaign[]>(`/admin/notifications/${c.id}`, { method: 'DELETE' }).then((list) => { setData('/admin/notifications', list); show('Canceled') }, (e) => show(errorMessage(e)))
  const audLabel = (c: Campaign) => c.audience === 'Followers' ? `Followers · ${c.dramaTitle}` : c.audience === 'User' ? `User ${c.targetUser}` : c.audience

  return (
    <AdminShell>
      <h1>Notifications</h1>
      <RoleNote perm="notify" admin={admin} />
      {can && (
        <div className="two-col">
          <form className="main-col" onSubmit={(e) => { e.preventDefault(); void submit() }}>
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }} className="stack gap-8">
              <legend className="label" style={{ marginBottom: 8 }}>Send to</legend>
              <div role="radiogroup" className="chips">
                {AUDIENCES.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={aud === k} className="chip" onClick={() => setAud(k)}>{l}</button>)}
              </div>
              {aud === 'Followers' && <select aria-label="Drama" className="input" value={dramaId} onChange={(e) => setDrama(e.target.value)}>{cat.list.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>}
              {aud === 'User' && <input aria-label="User ID" className="input" inputMode="numeric" placeholder="User ID, e.g. 10293847" value={userId} onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))} />}
            </fieldset>
            <div className="field"><label htmlFor="nt">Title</label><input id="nt" className="input" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="field"><label htmlFor="nb">Message</label><textarea id="nb" className="input" rows={2} maxLength={160} value={body} onChange={(e) => setBody(e.target.value)} /><span className="tiny faint" style={{ textAlign: 'right' }}>{body.length} / 160</span></div>
            <div className="field"><label htmlFor="wh">When</label>
              <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
                <select id="wh" className="input" style={{ flex: '1 1 160px', width: 'auto' }} value={when} onChange={(e) => setWhen(e.target.value as 'Send now' | 'Schedule')}><option>Send now</option><option>Schedule</option></select>
                {when === 'Schedule' && <input aria-label="Date and time" type="datetime-local" className="input" style={{ flex: '1 1 200px', width: 'auto' }} value={at} onChange={(e) => setAt(e.target.value)} />}
              </div>
              <span className="tiny faint">Delivered to in-app inboxes. Followers get it if they allow New episodes; Everyone, VIP and Not VIP reach people who allow Rewards and offers. One user always gets it.</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={!valid || busy}>{when === 'Send now' ? 'Send now' : 'Schedule'}</button>
              <button type="button" className="btn btn-secondary" disabled={!title.trim() || !body.trim()} onClick={test}>Send test to me</button>
            </div>
          </form>
          <aside className="side-col" aria-label="Preview">
            <span className="label">Preview</span>
            <div className="row" style={{ alignItems: 'flex-start', padding: 14, borderRadius: 18, background: '#2A2530' }}>
              <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#FFFFFF" /></svg></span>
              <span className="stack" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <span className="row between tiny muted"><span>The Ending</span><span>now</span></span>
                {title.trim() && <strong style={{ fontSize: 14 }}>{title}</strong>}
                {body.trim() && <span className="small" style={{ color: '#D7D0DA', lineHeight: 1.4 }}>{body}</span>}
                {!title.trim() && !body.trim() && <span className="small faint">Write a title and message to preview.</span>}
              </span>
              {aud === 'Followers' && d && <span style={{ width: 44, height: 58, borderRadius: 6, background: d.poster ? `center / cover url(${d.poster})` : d.color, flex: 'none' }} />}
            </div>
            <span className="tiny faint">In the apps this goes out as a push notification too; the poster shows as the large image.</span>
          </aside>
        </div>
      )}
      <section className="panel" style={{ padding: 0 }} aria-labelledby="hs">
        <h2 id="hs" style={{ padding: '18px 20px 6px', margin: 0 }}>History</h2>
        {!history.data ? <LoadState error={history.error} onRetry={history.reload} compact /> : history.data.length === 0 ? <p className="small faint" style={{ padding: '0 20px 18px', margin: 0 }}>Nothing sent yet.</p> : history.data.map((h) => (
          <div key={h.id} className="row" style={{ flexWrap: 'wrap', padding: '12px 20px', borderTop: '1px solid var(--surface-2)', fontSize: 14 }}>
            <span style={{ flex: '1 1 220px', fontWeight: 600 }}>{h.title}</span><span className="muted">{audLabel(h)}</span><span className="faint">{fmtStamp(h.sendAt)}</span>
            <span style={{ width: 110, textAlign: 'right' }}><StatusText value={h.status} />{h.status === 'Sent' && <span className="tiny faint"> · {h.sentCount}</span>}</span>
            {h.status === 'Scheduled' && can && <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(h)}>Cancel</button>}
          </div>
        ))}
      </section>
      {toast}
    </AdminShell>
  )
}
