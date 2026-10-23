'use client'

import Link from 'next/link'
import { AppShell, LoadState, TopBar, useToast } from '@/components/shell'
import { Icon, Switch } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { LANGUAGES } from '@/lib/constants'
import { invalidate } from '@/lib/data'
import { setSetting, useMe } from '@/lib/store'

function LinkRow({ href, label, value, danger }: { href: string; label: string; value?: string; danger?: boolean }) {
  return (
    <Link href={href} className="list-row" style={danger ? { color: 'var(--bad)' } : undefined}>
      <span className="grow">{label}</span>{value && <span className="small faint">{value}</span>}
      <Icon name="chevron" size={16} width={2.4} style={{ color: 'var(--text-3)' }} />
    </Link>
  )
}

export default function SettingsPage() {
  const { me, error } = useMe()
  const [toast, show] = useToast()
  if (!me) return <AppShell tabs={false}><TopBar title="Settings" back="/me/" /><LoadState error={error} /></AppShell>
  const toggle = (k: 'autoplay' | 'autoUnlock' | 'cellular', label: string) => (
    <div className="list-row"><span className="grow">{label}</span><Switch label={label} checked={me.settings[k]} onChange={(v) => setSetting(k, v).catch((e) => show(errorMessage(e)))} /></div>
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
        <LinkRow href="/settings/language/" label="Language" value={LANGUAGES.find((l) => l.code === me.settings.language)?.english} />
        <LinkRow href="/settings/notifications/" label="Notifications" />
        <button type="button" className="list-row" onClick={() => { invalidate('/'); show('Cache cleared') }}><span className="grow">Clear cache</span></button>
        {me.user.signedIn && (
          <>
            <h2 className="list-group-title">Account</h2>
            <LinkRow href="/profile/edit/" label="Edit profile and sign out" />
            <LinkRow href="/delete-account/" label="Delete account" danger />
          </>
        )}
        <h2 className="list-group-title">About</h2>
        <LinkRow href="/about/" label="Terms & privacy" />
        <div className="list-row"><span className="grow">Version</span><span className="small faint">Web 1.0.0</span></div>
      </div>
      {toast}
    </AppShell>
  )
}
