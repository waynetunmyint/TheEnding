'use client'

import { useState } from 'react'
import { AdminShell, StatusText } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { PUBLISHED, getDrama } from '@/data/dummy'

const AUDIENCES = ['Everyone', 'Followers of a drama', 'VIP', 'Not VIP', 'One user'] as const

export default function AdminNotifications() {
  const [toast, show] = useToast()
  const [aud, setAud] = useState<(typeof AUDIENCES)[number]>('Followers of a drama')
  const [drama, setDrama] = useState('divorced-ceo')
  const [userId, setUserId] = useState('')
  const [title, setTitle] = useState('EP 36 is out')
  const [body, setBody] = useState('She walks into the board meeting. He has no idea who she is.')
  const [when, setWhen] = useState<'Send now' | 'Schedule'>('Schedule')
  const [at, setAt] = useState('24/10/2026 · 8:00 PM')
  const [history, setHistory] = useState([
    { title: 'Coming soon: The Duke Who Married a Maid', aud: 'Everyone', when: '25/10/2026 · 7:00 PM', status: 'Scheduled' },
    { title: 'EP 35 is out', aud: "Followers · Divorced, Now I'm the CEO", when: '22/10/2026 · 8:00 PM', status: 'Sent' },
    { title: 'Weekend VIP deal', aud: 'Not VIP', when: '18/10/2026 · 10:00 AM', status: 'Sent' },
  ])
  const d = getDrama(drama)!
  const valid = title.trim() && body.trim() && (aud !== 'One user' || /^\d{6,}$/.test(userId)) && (when === 'Send now' || at.trim())
  const audLabel = aud === 'Followers of a drama' ? `Followers · ${d.title}` : aud === 'One user' ? `User ${userId}` : aud

  const submit = () => {
    if (!valid) return
    setHistory([{ title: title.trim(), aud: audLabel, when: when === 'Send now' ? 'Just now' : at, status: when === 'Send now' ? 'Sent' : 'Scheduled' }, ...history])
    show(when === 'Send now' ? 'Sent (demo, nobody was notified)' : 'Scheduled (demo)')
  }

  return (
    <AdminShell>
      <h1>Notifications</h1>
      <div className="two-col">
        <form className="main-col" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }} className="stack gap-8">
            <legend className="label" style={{ marginBottom: 8 }}>Send to</legend>
            <div role="radiogroup" className="chips">
              {AUDIENCES.map((a) => <button key={a} type="button" role="radio" aria-checked={aud === a} className="chip" onClick={() => setAud(a)}>{a}</button>)}
            </div>
            {aud === 'Followers of a drama' && <select aria-label="Drama" className="input" value={drama} onChange={(e) => setDrama(e.target.value)}>{PUBLISHED.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>}
            {aud === 'One user' && <input aria-label="User ID" className="input" placeholder="User ID, e.g. 10293847" value={userId} onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))} />}
          </fieldset>
          <div className="field"><label htmlFor="nt">Title</label><input id="nt" className="input" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field"><label htmlFor="nb">Message</label><textarea id="nb" className="input" rows={2} maxLength={160} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <div className="field"><label htmlFor="wh">When</label>
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <select id="wh" className="input" style={{ flex: '1 1 160px', width: 'auto' }} value={when} onChange={(e) => setWhen(e.target.value as 'Send now' | 'Schedule')}><option>Schedule</option><option>Send now</option></select>
              {when === 'Schedule' && <input aria-label="Date and time" className="input" style={{ flex: '1 1 200px', width: 'auto' }} placeholder="dd/MM/yyyy · 8:00 PM" value={at} onChange={(e) => setAt(e.target.value)} />}
            </div>
            <span className="tiny faint">Viewer&apos;s local time. Users who turned off this type are skipped.</span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={!valid}>{when === 'Send now' ? 'Send now' : 'Schedule'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => show('Test sent to you (demo)')}>Send test to me</button>
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
            </span>
            {aud === 'Followers of a drama' && <span style={{ width: 44, height: 58, borderRadius: 6, background: d.color, flex: 'none' }} />}
          </div>
          <span className="tiny faint">Android uses the monochrome notification icon; the poster shows as the large image.</span>
        </aside>
      </div>
      <section className="panel" style={{ padding: 0 }} aria-labelledby="hs">
        <h2 id="hs" style={{ padding: '18px 20px 6px', margin: 0 }}>History</h2>
        {history.map((h, i) => (
          <div key={i} className="row" style={{ flexWrap: 'wrap', padding: '12px 20px', borderTop: '1px solid var(--surface-2)', fontSize: 14 }}>
            <span style={{ flex: '1 1 220px', fontWeight: 600 }}>{h.title}</span><span className="muted">{h.aud}</span><span className="faint">{h.when}</span><span style={{ width: 100, textAlign: 'right' }}><StatusText value={h.status} /></span>
          </div>
        ))}
      </section>
      {toast}
    </AdminShell>
  )
}
