'use client'

import { useState, useSyncExternalStore } from 'react'
import { AppShell, LoadState, TopBar, useToast } from '@/components/shell'
import { Switch } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { claimTask, updateMe, useMe } from '@/lib/store'
import type { NotifyPrefs } from '@/lib/types'

const noop = () => () => {}

export default function NotificationSettingsPage() {
  const { me, error } = useMe()
  const [toast, show] = useToast()
  const [, rerender] = useState(0)
  const permission = useSyncExternalStore(noop, () => ('Notification' in window ? Notification.permission : 'unsupported'), () => 'default')
  if (!me) return <AppShell tabs={false}><TopBar title="Notifications" back="/settings/" /><LoadState error={error} /></AppShell>
  const blocked = permission === 'denied'
  const set = (k: keyof NotifyPrefs, v: boolean) => updateMe({ notify: { ...me.notify, [k]: v } }).catch((e) => show(errorMessage(e)))
  const turnOn = async () => {
    const result = await Notification.requestPermission()
    rerender((n) => n + 1)
    if (result === 'granted' && me.tasks.some((t) => t.key === 'notify' && t.claimable)) {
      claimTask('notify').then(() => show('Notifications on · bonus coins added'), () => {})
    }
  }
  const row = (k: keyof NotifyPrefs, label: string, hint: string, push: boolean) => {
    const off = push && blocked
    return (
      <div className="list-row" style={{ minHeight: 60, padding: '6px 0' }}>
        <span className="stack grow" style={{ gap: 2 }}>
          <span style={{ color: off ? 'var(--text-3)' : undefined }}>{label}</span>
          {hint && <span className="small faint">{hint}</span>}
        </span>
        <Switch label={label} checked={me.notify[k] && !off} disabled={off} onChange={(v) => set(k, v)} />
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
            <span className="small" style={{ color: '#D7C3CB', lineHeight: 1.5 }}>Allow notifications for this site in your browser settings. Your in-app inbox keeps working either way.</span>
          </div>
        )}
        {permission === 'default' && (
          <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 8 }} onClick={turnOn}>Turn on browser notifications</button>
        )}
        <h2 className="list-group-title" style={{ marginTop: 8 }}>Notify me about</h2>
        {row('episodes', 'New episodes', 'Dramas in My List', true)}
        {row('premieres', 'Premiere reminders', 'Dramas you asked to be reminded about', true)}
        {row('replies', 'Replies to my comments', '', true)}
        {row('offers', 'Rewards and offers', 'Bonus coins and VIP deals', true)}
        <h2 className="list-group-title">On this device</h2>
        {row('checkin', 'Daily check-in reminder', 'A reminder at 8:00 PM', false)}
        <p className="small faint" style={{ marginTop: 16, lineHeight: 1.5 }}>Notifications arrive in your inbox under Me › Notifications.</p>
      </div>
      {toast}
    </AppShell>
  )
}
