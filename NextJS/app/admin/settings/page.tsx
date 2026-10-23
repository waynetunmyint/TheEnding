'use client'

import { useState } from 'react'
import { AdminShell, RoleNote, useAdmin } from '@/components/admin-shell'
import { LoadState, useToast } from '@/components/shell'
import { Switch } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { invalidate, setData, useApi } from '@/lib/data'
import { fmtStamp } from '@/lib/format'
import type { AdminUser, Versions } from '@/lib/types'

type Data = { versions: Versions; maintenance: boolean; supportEmail: string; admins: AdminUser[]; audit: { who: string; what: string; at: number }[] }
const ROLES = ['Editor', 'Support', 'Moderator'] as const
const VERSION = /^\d+\.\d+\.\d+$/

function Editor({ data, show }: { data: Data; show: (m: string) => void }) {
  const admin = useAdmin()
  const can = admin.can('settings')
  const [versions, setVersions] = useState(data.versions)
  const [maintenance, setMaintenance] = useState(data.maintenance)
  const [support, setSupport] = useState(data.supportEmail)
  const [invite, setInvite] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('Editor')
  const [busy, setBusy] = useState(false)
  const badVersion = Object.values(versions).some((v) => !VERSION.test(v))
  const dirty = JSON.stringify(versions) !== JSON.stringify(data.versions) || maintenance !== data.maintenance || support !== data.supportEmail
  const inviteOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.trim()) && !data.admins.some((a) => a.email === invite.trim().toLowerCase())

  const run = async (fn: () => Promise<Data>, msg: string) => {
    setBusy(true)
    try {
      setData('/admin/settings', await fn())
      invalidate('/config')
      show(msg)
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const save = () => run(() => api<Data>('/admin/settings', { method: 'PUT', body: { versions, maintenance, supportEmail: support } }), 'Saved')
  const addAdmin = () => run(() => api<Data>('/admin/admins', { method: 'POST', body: { email: invite.trim(), role: inviteRole } }), `${invite.trim()} added as ${inviteRole}`).then(() => setInvite(''))
  const setRole = (a: AdminUser, role: string) => run(() => api<Data>(`/admin/admins/${a.id}`, { method: 'PATCH', body: { role } }), role ? `${a.name} is now ${role}` : `${a.name} removed from the team`)

  return (
    <>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Settings</h1>
        {can && <button type="button" className="btn btn-primary btn-sm" style={{ minHeight: 42 }} disabled={badVersion || !dirty || busy} onClick={save}>Save changes</button>}
      </div>
      <RoleNote perm="settings" admin={admin} />
      <div className="two-col">
        <section className="panel main-col" style={{ gap: 12 }} aria-labelledby="av">
          <h2 id="av" style={{ margin: 0 }}>App versions</h2>
          <span className="small faint">Below the minimum, the apps show a required update with no Later button.</span>
          <fieldset disabled={!can} style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {([['androidMin', 'Android minimum'], ['androidLatest', 'Android latest'], ['iosMin', 'iOS minimum'], ['iosLatest', 'iOS latest']] as const).map(([k, label]) => (
                <div key={k} className="field"><label htmlFor={k}>{label}</label>
                  <input id={k} className="input" style={{ background: 'var(--bg)', borderColor: VERSION.test(versions[k]) ? undefined : 'var(--bad)' }} value={versions[k]} onChange={(e) => setVersions({ ...versions, [k]: e.target.value })} aria-invalid={!VERSION.test(versions[k])} /></div>
              ))}
            </div>
            {badVersion && <span role="alert" className="tiny" style={{ color: 'var(--bad)' }}>Use the format 1.2.3.</span>}
            <div className="row" style={{ paddingTop: 10, borderTop: '1px solid var(--surface-2)' }}>
              <span className="stack" style={{ flex: 1, gap: 2 }}><span style={{ fontWeight: 600, fontSize: 14 }}>Maintenance mode</span><span className="tiny faint">The app and web show a &quot;back soon&quot; screen; admins still get in</span></span>
              <Switch label="Maintenance mode" checked={maintenance} disabled={!can} onChange={setMaintenance} />
            </div>
            <div className="field"><label htmlFor="se">Support email</label><input id="se" className="input" type="email" style={{ background: 'var(--bg)' }} value={support} onChange={(e) => setSupport(e.target.value)} /></div>
          </fieldset>
        </section>

        <section className="panel side-col" style={{ gap: 10 }} aria-labelledby="ad">
          <h2 id="ad" style={{ margin: 0 }}>Admins</h2>
          {data.admins.map((a) => (
            <div key={a.id} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--surface-2)' }}>
              <span className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span><span className="tiny faint" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.email}</span></span>
              {a.role === 'Owner' || !can ? <span className="small muted" style={{ width: 130, textAlign: 'right' }}>{a.role}</span> : (
                <select aria-label={`Role for ${a.name}`} className="input" style={{ width: 130, minHeight: 40, background: 'var(--bg)' }} value={a.role} disabled={busy} onChange={(e) => void setRole(a, e.target.value)}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}<option value="">Remove</option>
                </select>
              )}
            </div>
          ))}
          {can && (
            <form className="row" style={{ gap: 8, paddingTop: 6, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); if (inviteOk) void addAdmin() }}>
              <input aria-label="Add by email" className="input" placeholder="name@example.com" value={invite} onChange={(e) => setInvite(e.target.value)} style={{ flex: '1 1 160px', background: 'var(--bg)', minHeight: 42 }} />
              <select aria-label="Role" className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ width: 120, minHeight: 42, background: 'var(--bg)' }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              <button type="submit" className="btn btn-secondary btn-sm" style={{ minHeight: 42 }} disabled={!inviteOk || busy}>Add</button>
            </form>
          )}
          <p className="tiny faint" style={{ margin: 0, lineHeight: 1.5 }}>Editor: dramas, episodes, Home, notifications. Support: users, payments, coin adjustments. Moderator: comments. Owner: everything. New admins sign in with their email code.</p>
        </section>
      </div>
      <section className="panel" style={{ padding: 0 }} aria-labelledby="al">
        <h2 id="al" style={{ padding: '18px 20px 6px', margin: 0 }}>Audit log</h2>
        {data.audit.length === 0 && <p className="small faint" style={{ padding: '0 20px 18px', margin: 0 }}>No admin changes yet.</p>}
        {data.audit.map((l, i) => (
          <div key={i} className="row" style={{ flexWrap: 'wrap', padding: '12px 20px', borderTop: '1px solid var(--surface-2)', fontSize: 14 }}>
            <span className="faint" style={{ width: 170 }}>{fmtStamp(l.at)}</span><span style={{ width: 150, fontWeight: 600 }}>{l.who}</span><span style={{ flex: '1 1 260px', color: '#D7D0DA' }}>{l.what}</span>
          </div>
        ))}
      </section>
    </>
  )
}

export default function AdminSettings() {
  const q = useApi<Data>('/admin/settings')
  const [toast, show] = useToast()
  return <AdminShell>{q.data ? <Editor key={JSON.stringify([q.data.versions, q.data.maintenance, q.data.supportEmail])} data={q.data} show={show} /> : <LoadState error={q.error} onRetry={q.reload} />}{toast}</AdminShell>
}
