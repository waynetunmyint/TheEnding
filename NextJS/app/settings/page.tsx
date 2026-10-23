'use client'

import Link from 'next/link'
import { AppShell, TopBar, useToast } from '@/components/shell'
import { Icon, Switch } from '@/components/ui'
import { LANGUAGES } from '@/data/dummy'
import { update, useDemo, type DemoState } from '@/lib/demo-store'

function LinkRow({ href, label, value, danger }: { href: string; label: string; value?: string; danger?: boolean }) {
  return (
    <Link href={href} className="list-row" style={danger ? { color: 'var(--bad)' } : undefined}>
      <span className="grow">{label}</span>{value && <span className="small faint">{value}</span>}
      <Icon name="chevron" size={16} width={2.4} style={{ color: 'var(--text-3)' }} />
    </Link>
  )
}

export default function SettingsPage() {
  const s = useDemo()
  const [toast, show] = useToast()
  const set = (k: keyof DemoState['settings'], v: boolean) => update((x) => ({ ...x, settings: { ...x.settings, [k]: v } }))
  const toggle = (k: 'autoplay' | 'autoUnlock' | 'cellular', label: string) => (
    <div className="list-row"><span className="grow">{label}</span><Switch label={label} checked={s.settings[k]} onChange={(v) => set(k, v)} /></div>
  )
  return (
    <AppShell tabs={false}>
      <TopBar title="Settings" back="/me/" />
      <div className="pad narrow">
        <h2 className="list-group-title" style={{ marginTop: 4 }}>Playback</h2>
        {toggle('autoplay', 'Autoplay next episode')}
        {toggle('autoUnlock', 'Auto-unlock with coins')}
        {toggle('cellular', 'Play on mobile data')}
        <h2 className="list-group-title">App</h2>
        <LinkRow href="/settings/language/" label="Language" value={LANGUAGES.find((l) => l.code === s.settings.language)?.english} />
        <LinkRow href="/settings/notifications/" label="Notifications" />
        <button type="button" className="list-row" onClick={() => show('Cache cleared')}><span className="grow">Clear cache</span></button>
        {s.signedIn && (
          <>
            <h2 className="list-group-title">Account</h2>
            <LinkRow href="/profile/edit/" label="Edit profile and sign out" />
            <LinkRow href="/delete-account/" label="Delete account" danger />
          </>
        )}
        <h2 className="list-group-title">About</h2>
        <LinkRow href="/about/" label="Terms & privacy" />
        <div className="list-row"><span className="grow">Version</span><span className="small faint">Web demo 0.1.0</span></div>
      </div>
      {toast}
    </AppShell>
  )
}
