'use client'

import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { useToast } from '@/components/shell'
import { Switch } from '@/components/ui'
import { AUDIT_LOG } from '@/data/dummy'

const ROLES = ['Owner', 'Editor', 'Support', 'Moderator'] as const
const VERSION = /^\d+\.\d+\.\d+$/

export default function AdminSettings() {
  const [toast, show] = useToast()
  const [versions, setVersions] = useState({ androidMin: '1.0.0', androidLatest: '1.3.0', iosMin: '1.0.0', iosLatest: '1.3.0' })
  const [maintenance, setMaintenance] = useState(false)
  const [support, setSupport] = useState('support@example.com')
  const [admins, setAdmins] = useState([
    { name: 'Wayne Tun Myint', email: 'owner', role: 'Owner' },
    { name: 'Content editor', email: 'editor@example.com', role: 'Editor' },
    { name: 'Support agent', email: 'support@example.com', role: 'Support' },
    { name: 'Moderator', email: 'mod@example.com', role: 'Moderator' },
  ])
  const [invite, setInvite] = useState('')
  const badVersion = Object.values(versions).some((v) => !VERSION.test(v))
  const inviteOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.trim()) && !admins.some((a) => a.email === invite.trim())

  return (
    <AdminShell>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Settings</h1>
        <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} disabled={badVersion} onClick={() => show('Saved (demo, not stored)')}>Save changes</button>
      </div>
      <div className="two-col">
        <section className="panel main-col" style={{ gap: 12 }} aria-labelledby="av">
          <h2 id="av" style={{ margin: 0 }}>App versions</h2>
          <span className="small faint">Below the minimum, the app shows a required update with no Later button.</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {([['androidMin', 'Android minimum'], ['androidLatest', 'Android latest'], ['iosMin', 'iOS minimum'], ['iosLatest', 'iOS latest']] as const).map(([k, label]) => (
              <div key={k} className="field"><label htmlFor={k}>{label}</label>
                <input id={k} className="input" style={{ background: 'var(--bg)', borderColor: VERSION.test(versions[k]) ? undefined : 'var(--bad)' }} value={versions[k]} onChange={(e) => setVersions({ ...versions, [k]: e.target.value })} aria-invalid={!VERSION.test(versions[k])} /></div>
            ))}
          </div>
          {badVersion && <span role="alert" className="tiny" style={{ color: 'var(--bad)' }}>Use the format 1.2.3.</span>}
          <div className="row" style={{ paddingTop: 10, borderTop: '1px solid var(--surface-2)' }}>
            <span className="stack" style={{ flex: 1, gap: 2 }}><span style={{ fontWeight: 600, fontSize: 14 }}>Maintenance mode</span><span className="tiny faint">Apps and web show a &quot;back soon&quot; screen</span></span>
            <Switch label="Maintenance mode" checked={maintenance} onChange={setMaintenance} />
          </div>
          <div className="field"><label htmlFor="se">Support email</label><input id="se" className="input" style={{ background: 'var(--bg)' }} value={support} onChange={(e) => setSupport(e.target.value)} /></div>
        </section>

        <section className="panel side-col" style={{ gap: 10 }} aria-labelledby="ad">
          <h2 id="ad" style={{ margin: 0 }}>Admins</h2>
          {admins.map((a, i) => (
            <div key={a.email} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--surface-2)' }}>
              <span className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span><span className="tiny faint">{a.email}</span></span>
              <select aria-label={`Role for ${a.name}`} className="input" style={{ width: 130, minHeight: 40, background: 'var(--bg)' }} disabled={a.role === 'Owner'} value={a.role}
                onChange={(e) => setAdmins(admins.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}>
                {ROLES.filter((r) => a.role === 'Owner' || r !== 'Owner').map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          ))}
          <form className="row" style={{ gap: 8, paddingTop: 6 }} onSubmit={(e) => { e.preventDefault(); if (inviteOk) { setAdmins([...admins, { name: 'Invited', email: invite.trim(), role: 'Editor' }]); setInvite(''); show('Invite sent (demo)') } }}>
            <input aria-label="Invite by email" className="input" placeholder="name@example.com" value={invite} onChange={(e) => setInvite(e.target.value)} style={{ flex: 1, background: 'var(--bg)', minHeight: 42 }} />
            <button type="submit" className="btn btn-secondary btn-sm" style={{ minHeight: 42 }} disabled={!inviteOk}>Invite</button>
          </form>
          <p className="tiny faint" style={{ margin: 0, lineHeight: 1.5 }}>Editor: dramas, episodes, Home. Support: users, payments, coin adjustments. Moderator: comments. Owner: everything.</p>
        </section>
      </div>
      <section className="panel" style={{ padding: 0 }} aria-labelledby="al">
        <h2 id="al" style={{ padding: '18px 20px 6px', margin: 0 }}>Audit log</h2>
        {AUDIT_LOG.map((l, i) => (
          <div key={i} className="row" style={{ flexWrap: 'wrap', padding: '12px 20px', borderTop: '1px solid var(--surface-2)', fontSize: 14 }}>
            <span className="faint" style={{ width: 170 }}>{l.when}</span><span style={{ width: 150, fontWeight: 600 }}>{l.who}</span><span style={{ flex: '1 1 260px', color: '#D7D0DA' }}>{l.what}</span>
          </div>
        ))}
      </section>
      {toast}
    </AdminShell>
  )
}
