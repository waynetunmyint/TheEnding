import type { Metadata } from 'next'
import { AppShell, TopBar } from '@/components/shell'

export const metadata: Metadata = { title: 'About' }

const SECTIONS = [
  { id: 'terms', title: 'Terms of Service', body: 'This build of The Ending is a demo. Sign-in, payments and ads are simulated, and the sample dramas, coins and VIP have no real value. Publish your own terms before launch.' },
  { id: 'privacy', title: 'Privacy Policy', body: 'Your account, list, coins, comments and watch history are stored by the server running this copy of The Ending, in its own SQLite database. Nothing is shared with third parties. Delete your account any time from Settings to remove your personal data.' },
  { id: 'coins', title: 'Coin and VIP terms', body: 'In the real app, unlocked episodes stay unlocked forever, coins do not expire, and VIP renews through Google Play or the App Store until you cancel there.' },
  { id: 'content', title: 'Content guidelines', body: 'Comments must be respectful. Spam, spoilers without warning and harassment are hidden by moderators.' },
]

export default function AboutPage() {
  return (
    <AppShell tabs={false}>
      <TopBar title="About" back="/settings/" />
      <div className="stack gap-24 pad narrow" style={{ paddingBottom: 24 }}>
        <div className="stack gap-12" style={{ alignItems: 'center', padding: '16px 0 8px' }}>
          <img src="/logo.png" alt="The Ending logo" width={72} height={101} style={{ objectFit: 'contain' }} />
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.8 }}>The Endıng<span style={{ color: '#FF3D5E' }}>.</span></div>
          <div className="small faint">Web 1.0.0</div>
        </div>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>{s.title}</h2>
            <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>{s.body}</p>
          </section>
        ))}
        <p className="small faint" style={{ textAlign: 'center', lineHeight: 1.6 }}>
          Open source under the MIT License.<br />
          <a href="https://github.com/waynetunmyint/TheEnding" target="_blank" rel="noopener noreferrer">github.com/waynetunmyint/TheEnding</a>
        </p>
      </div>
    </AppShell>
  )
}
