'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GENRES } from '@/data/dummy'
import { update } from '@/lib/demo-store'

export default function WelcomePage() {
  const router = useRouter()
  const [picked, setPicked] = useState<string[]>(['Romance', 'CEO', 'Revenge'])
  const finish = (genres: string[]) => {
    update((s) => ({ ...s, onboarded: true, genres }))
    router.push('/')
  }
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '16px 20px calc(32px + env(safe-area-inset-bottom))', maxWidth: 520, margin: '0 auto' }}>
      <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => finish([])}>Skip</button></div>
      <h1 style={{ margin: '24px 0 8px', fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>What do you love to watch?</h1>
      <p className="muted" style={{ margin: '0 0 28px', lineHeight: 1.5 }}>Pick a few. We&apos;ll fill your For You feed with stories like these.</p>
      <div className="chips" style={{ gap: 10 }}>
        {GENRES.map((g) => {
          const on = picked.includes(g)
          return (
            <button key={g} type="button" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== g) : [...picked, g])}
              className="chip" style={{ minHeight: 44, padding: '0 18px', fontSize: 15, background: on ? 'var(--primary)' : 'var(--surface)', color: on ? '#FFFFFF' : '#E6E0E8' }}>{g}</button>
          )
        })}
      </div>
      <div style={{ flex: 1, minHeight: 32 }} />
      <p className="small faint" style={{ textAlign: 'center' }}>{picked.length} selected</p>
      <button type="button" className="btn btn-primary btn-block" onClick={() => finish(picked)}>Start watching</button>
    </div>
  )
}
