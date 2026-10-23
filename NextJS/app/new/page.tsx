'use client'

import Link from 'next/link'
import { AppShell, HomeHeader, useToast } from '@/components/shell'
import { Poster } from '@/components/ui'
import { COMING_SOON, PUBLISHED } from '@/data/dummy'
import { toggleIn, useDemo } from '@/lib/demo-store'

export default function NewPage() {
  const s = useDemo()
  const [toast, show] = useToast()
  const week = [...PUBLISHED].sort((a, b) => b.releaseDate.split('/').reverse().join('').localeCompare(a.releaseDate.split('/').reverse().join(''))).slice(0, 9)
  return (
    <AppShell>
      <HomeHeader />
      <div className="stack gap-24" style={{ paddingTop: 6 }}>
        <section aria-labelledby="cs">
          <div className="section-head"><h2 id="cs">Coming soon</h2></div>
          <div className="row pad" style={{ gap: 12, overflowX: 'auto', alignItems: 'stretch' }}>
            {COMING_SOON.map((d) => {
              const on = s.reminders.includes(d.id)
              return (
                <div key={d.id} className="row" style={{ flex: 'none', width: 260, alignItems: 'stretch' }}>
                  <div style={{ width: 84, flex: 'none' }}><Poster drama={d} showEps={false} badge={false} /></div>
                  <div className="stack gap-6" style={{ flex: 1, minWidth: 0 }}>
                    <span className="tiny" style={{ color: '#FFC46B', fontWeight: 700 }}>Out {d.releaseDate}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</span>
                    <button type="button" className={`btn btn-sm ${on ? 'btn-secondary' : 'btn-primary'}`} style={{ marginTop: 'auto', alignSelf: 'flex-start' }} aria-pressed={on}
                      onClick={() => { toggleIn('reminders', d.id); show(on ? 'Reminder removed' : "We'll remind you on premiere day") }}>
                      {on ? 'Reminder set' : 'Remind me'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
        <section aria-labelledby="ow">
          <div className="section-head"><h2 id="ow">Out recently</h2></div>
          <div className="poster-grid">
            {week.map((d) => (
              <Link key={d.id} href={`/drama/${d.id}/`} className="card-link">
                <Poster drama={{ ...d, badge: 'New' }} />
                <span className="card-title">{d.title}</span>
                <span className="card-sub">{d.releaseDate}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      {toast}
    </AppShell>
  )
}
