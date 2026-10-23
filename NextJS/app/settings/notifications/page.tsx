'use client'

import { useSyncExternalStore } from 'react'
import { AppShell, TopBar } from '@/components/shell'
import { Switch } from '@/components/ui'
import { update, useDemo, type DemoState } from '@/lib/demo-store'

const noop = () => () => {}

export default function NotificationSettingsPage() {
  const s = useDemo()
  const permission = useSyncExternalStore(noop, () => ('Notification' in window ? Notification.permission : 'unsupported'), () => 'default')
  const blocked = permission === 'denied'
  const set = (k: keyof DemoState['notify'], v: boolean) => update((x) => ({ ...x, notify: { ...x.notify, [k]: v } }))
  const row = (k: keyof DemoState['notify'], label: string, hint: string, push: boolean) => {
    const off = push && blocked
    return (
      <div className="list-row" style={{ minHeight: 60, padding: '6px 0' }}>
        <span className="stack grow" style={{ gap: 2 }}>
          <span style={{ color: off ? 'var(--text-3)' : undefined }}>{label}</span>
          {hint && <span className="small faint">{hint}</span>}
        </span>
        <Switch label={label} checked={s.notify[k] && !off} disabled={off} onChange={(v) => set(k, v)} />
      </div>
    )
  }
  return (
    <AppShell tabs={false}>
      <TopBar title="Notifications" back="/settings/" />
      <div className="pad narrow">
        {blocked && (
          <div role="status" className="stack gap-8" style={{ padding: 16, borderRadius: 16, background: '#2B1A1E', marginBottom: 8 }}>
            <strong>Notifications are blocked in this browser</strong>
            <span className="small" style={{ color: '#D7C3CB', lineHeight: 1.5 }}>Allow notifications for this site in your browser settings to hear about new episodes.</span>
          </div>
        )}
        {permission === 'default' && (
          <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 8 }} onClick={() => Notification.requestPermission().then(() => update((x) => ({ ...x })))}>Turn on browser notifications</button>
        )}
        <h2 className="list-group-title" style={{ marginTop: 8 }}>Push notifications</h2>
        {row('episodes', 'New episodes', 'Dramas in My List', true)}
        {row('premieres', 'Premiere reminders', 'Dramas you asked to be reminded about', true)}
        {row('replies', 'Replies to my comments', '', true)}
        {row('offers', 'Rewards and offers', 'Bonus coins and VIP deals', true)}
        <h2 className="list-group-title">On this device</h2>
        {row('checkin', 'Daily check-in reminder', 'A local reminder at 8:00 PM', false)}
      </div>
    </AppShell>
  )
}
