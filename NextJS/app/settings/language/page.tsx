'use client'

import { AppShell, TopBar } from '@/components/shell'
import { Icon } from '@/components/ui'
import { LANGUAGES } from '@/data/dummy'
import { update, useDemo } from '@/lib/demo-store'

export default function LanguagePage() {
  const s = useDemo()
  return (
    <AppShell tabs={false}>
      <TopBar title="Language" back="/settings/" />
      <div role="radiogroup" aria-label="App language" className="stack pad narrow">
        {LANGUAGES.map((l) => {
          const on = s.settings.language === l.code
          return (
            <button key={l.code} type="button" role="radio" aria-checked={on} lang={l.code} className="list-row" style={{ minHeight: 56 }}
              onClick={() => update((x) => ({ ...x, settings: { ...x.settings, language: l.code } }))}>
              <span className="stack grow" style={{ gap: 2 }}><span style={{ fontWeight: 600 }}>{l.name}</span><span className="small faint">{l.english}</span></span>
              {on && <Icon name="check" size={22} width={2.6} style={{ color: 'var(--accent)' }} />}
            </button>
          )
        })}
        <p className="small faint" style={{ marginTop: 16, lineHeight: 1.5 }}>Subtitles follow this language when the drama offers it. The demo interface stays in English.</p>
      </div>
    </AppShell>
  )
}
