'use client'

import { useState } from 'react'
import { AppShell, TopBar } from '@/components/shell'
import { Icon } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { FAQS, HELP_TOPICS } from '@/lib/constants'
import { useConfig } from '@/lib/data'

export default function HelpPage() {
  const config = useConfig()
  const [open, setOpen] = useState(0)
  const [topic, setTopic] = useState<string>(HELP_TOPICS[0])
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const send = async () => {
    if (!msg.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api('/help', { method: 'POST', body: { topic, message: msg.trim() } })
      setSent(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
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
              <strong>Message sent</strong>
              <span className="small muted">Our support team sees it in the admin panel{config.data?.supportEmail ? ` and replies from ${config.data.supportEmail}` : ''}.</span>
              <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => { setSent(false); setMsg('') }}>Write another</button>
            </div>
          ) : (
            <form className="stack gap-12" onSubmit={(e) => { e.preventDefault(); void send() }}>
              <div className="field">
                <label htmlFor="tp">Topic</label>
                <select id="tp" className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {HELP_TOPICS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ms">Message</label>
                <textarea id="ms" className="input" rows={4} maxLength={2000} placeholder="Tell us what happened. Include the drama and episode if it's about playback." value={msg} onChange={(e) => setMsg(e.target.value)} />
              </div>
              {error && <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>{error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={!msg.trim() || busy}>Send</button>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  )
}
