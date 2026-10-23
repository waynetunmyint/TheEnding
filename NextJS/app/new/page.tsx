'use client'

import Link from 'next/link'
import { AppShell, HomeHeader, LoadState, useToast } from '@/components/shell'
import { Poster } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApi, useCatalog } from '@/lib/data'
import { fmtDate, fmtStamp } from '@/lib/format'
import { toggleList, useMe } from '@/lib/store'
import type { Home } from '@/lib/types'

export default function NewPage() {
  const cat = useCatalog()
  const home = useApi<Home>('/home')
  const { me } = useMe()
  const [toast, show] = useToast()
  if (!cat.ready || !home.data) {
    return <AppShell><HomeHeader /><LoadState error={cat.error ?? home.error} onRetry={() => { void cat.reload(); void home.reload() }} /></AppShell>
  }
  const soon = cat.pick(home.data.soon).filter((d) => d.status === 'Scheduled')
  const recent = [...cat.published].sort((a, b) => b.releaseAt - a.releaseAt).slice(0, 9)
  return (
    <AppShell>
      <HomeHeader />
      <div className="stack gap-24" style={{ paddingTop: 6 }}>
        {soon.length > 0 && (
          <section aria-labelledby="cs">
            <div className="section-head"><h2 id="cs">Coming soon</h2></div>
            <div className="row pad" style={{ gap: 12, overflowX: 'auto', alignItems: 'stretch' }}>
              {soon.map((d) => {
                const on = me?.reminders.includes(d.id) ?? false
                return (
                  <div key={d.id} className="row" style={{ flex: 'none', width: 260, alignItems: 'stretch' }}>
                    <Link href={`/drama/${d.id}/`} style={{ width: 84, flex: 'none' }} aria-label={d.title}><Poster drama={d} showEps={false} badge={false} /></Link>
                    <div className="stack gap-6" style={{ flex: 1, minWidth: 0 }}>
                      <span className="tiny" style={{ color: '#FFC46B', fontWeight: 700 }}>Out {fmtStamp(d.releaseAt)}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</span>
                      <button type="button" className={`btn btn-sm ${on ? 'btn-secondary' : 'btn-primary'}`} style={{ marginTop: 'auto', alignSelf: 'flex-start' }} aria-pressed={on} disabled={!me}
                        onClick={() => toggleList('reminders', d.id).then(() => show(on ? 'Reminder removed' : "We'll remind you on premiere day"), (e) => show(errorMessage(e)))}>
                        {on ? 'Reminder set' : 'Remind me'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        <section aria-labelledby="ow">
          <div className="section-head"><h2 id="ow">Out recently</h2></div>
          <div className="poster-grid">
            {recent.map((d) => (
              <Link key={d.id} href={`/drama/${d.id}/`} className="card-link">
                <Poster drama={{ ...d, badge: 'New' }} />
                <span className="card-title">{d.title}</span>
                <span className="card-sub">{fmtDate(d.releaseAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      {toast}
    </AppShell>
  )
}
