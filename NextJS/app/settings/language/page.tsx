'use client'

import { AppShell, LoadState, TopBar, useToast } from '@/components/shell'
import { Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { LANGUAGES } from '@/lib/constants'
import { setSetting, useMe } from '@/lib/store'

export default function LanguagePage() {
  const { me, error } = useMe()
  const [toast, show] = useToast()
  return (
    <AppShell tabs={false}>
      <TopBar title="Language" back="/settings/" />
      {!me ? <LoadState error={error} /> : (
        <div role="radiogroup" aria-label="App language" className="stack pad narrow">
          {LANGUAGES.map((l) => {
            const on = me.settings.language === l.code
            return (
              <button key={l.code} type="button" role="radio" aria-checked={on} lang={l.code} className="list-row" style={{ minHeight: 56 }}
                onClick={() => setSetting('language', l.code).catch((e) => show(errorMessage(e)))}>
                <span className="stack grow" style={{ gap: 2 }}><span style={{ fontWeight: 600 }}>{l.name}</span><span className="small faint">{l.english}</span></span>
                {on && <Icon name="check" size={22} width={2.6} style={{ color: 'var(--accent)' }} />}
              </button>
            )
          })}
          <p className="small faint" style={{ marginTop: 16, lineHeight: 1.5 }}>Subtitles follow this language when the drama offers it. The web interface is in English for now.</p>
        </div>
      )}
      {toast}
    </AppShell>
  )
}
