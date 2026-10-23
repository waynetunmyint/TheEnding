import type { Metadata } from 'next'
import { AppShell, TopBar } from '@/components/shell'

export const metadata: Metadata = { title: 'About' }

const SECTIONS = [
  { id: 'terms', title: 'Terms of Service', body: 'This is a demo of The Ending. Sample dramas, coins, VIP and payments are made up and have no value. The full terms will be published before launch.' },
  { id: 'privacy', title: 'Privacy Policy', body: 'The demo stores your choices (saved dramas, coins, sign-in state) only in this browser. Nothing is sent to a server. Clear it any time with Reset at the top of the page.' },
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
          <div className="small faint">Web demo 0.1.0</div>
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
