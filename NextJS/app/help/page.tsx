'use client'

import { useState } from 'react'
import { AppShell, TopBar } from '@/components/shell'
import { Icon } from '@/components/ui'
import { FAQS } from '@/data/dummy'

export default function HelpPage() {
  const [open, setOpen] = useState(0)
  const [topic, setTopic] = useState('Payment or coins')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <AppShell tabs={false}>
      <TopBar title="Help & feedback" back="/me/" />
      <div className="stack gap-24 pad narrow">
        <section aria-labelledby="fq">
          <h2 id="fq" className="list-group-title" style={{ marginTop: 0 }}>Common questions</h2>
          {FAQS.map(([q, a], i) => (
            <div key={q} style={{ borderBottom: '1px solid var(--surface)' }}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="list-row" style={{ borderBottom: 'none' }}>
                <span className="grow">{q}</span>
                <Icon name="chevronDown" size={16} width={2.4} style={{ color: 'var(--text-3)', transform: open === i ? 'rotate(180deg)' : undefined }} />
              </button>
              {open === i && <p className="small muted" style={{ margin: '0 0 14px', lineHeight: 1.55 }}>{a}</p>}
            </div>
          ))}
        </section>
        <section aria-labelledby="ct">
          <h2 id="ct" className="list-group-title" style={{ marginTop: 0 }}>Still stuck? Write to us</h2>
          {sent ? (
            <div role="status" className="stack gap-8" style={{ padding: 16, borderRadius: 16, background: 'var(--surface)' }}>
              <strong>Message ready</strong>
              <span className="small muted">Demo: nothing was sent. In the real app we reply by email within 2 working days.</span>
              <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => { setSent(false); setMsg('') }}>Write another</button>
            </div>
          ) : (
            <form className="stack gap-12" onSubmit={(e) => { e.preventDefault(); if (msg.trim()) setSent(true) }}>
              <div className="field">
                <label htmlFor="tp">Topic</label>
                <select id="tp" className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  <option>Payment or coins</option><option>Playback problem</option><option>Account and sign-in</option><option>Something else</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="ms">Message</label>
                <textarea id="ms" className="input" rows={4} placeholder="Tell us what happened. Include the drama and episode if it's about playback." value={msg} onChange={(e) => setMsg(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={!msg.trim()}>Send</button>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  )
}
