'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { LoadState, useRouteId, useToast } from '@/components/shell'
import { Avatar, Coin, CrownIcon, Icon, PlayIcon, Poster, Switch } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { REPORT_REASONS } from '@/lib/constants'
import { useApi, useCatalog, useConfig } from '@/lib/data'
import { duration, fmtDate, price } from '@/lib/format'
import { dramaLink, shareDrama } from '@/lib/share'
import {
  completeAd, getMe, isUnlocked, reportWatch, setProgress, setSetting, startAd, toggleList, unlockWithCoins, useMe, vipActive,
} from '@/lib/store'
import type { Comment, Drama, Episode } from '@/lib/types'

type Sheet = null | 'episodes' | 'unlock' | 'topup' | 'comments' | 'share' | 'settings' | 'ad' | 'adDone' | 'end'
const SPEEDS = [0.75, 1, 1.25, 1.5, 2]
const QUALITIES = ['Auto', '480p', '720p', '1080p', '4K']

function SheetFrame({ title, onClose, children, label }: { title: string; onClose: () => void; children: React.ReactNode; label?: string }) {
  return (
    <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={label ?? title}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} style={{ color: 'var(--text-2)', marginRight: -10 }}><Icon name="close" size={20} width={2.2} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function Comments({ drama, ep, show }: { drama: Drama; ep: number; show: (m: string) => void }) {
  const { me } = useMe()
  const q = useApi<Comment[]>(`/comments?drama=${encodeURIComponent(drama.id)}&ep=${ep}`)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [reporting, setReporting] = useState(0)
  const post = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      await api('/comments', { method: 'POST', body: { dramaId: drama.id, ep, text } })
      setDraft('')
      await q.reload()
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const remove = async (id: number) => {
    try {
      await api(`/comments/${id}`, { method: 'DELETE' })
      await q.reload()
    } catch (e) {
      show(errorMessage(e))
    }
  }
  const report = async (id: number, reason: string) => {
    setReporting(0)
    try {
      await api(`/comments/${id}/report`, { method: 'POST', body: { reason } })
      show('Thanks. A moderator will take a look.')
    } catch (e) {
      show(errorMessage(e))
    }
  }
  return (
    <>
      <ul className="list stack gap-16" style={{ maxHeight: '48dvh', overflowY: 'auto' }}>
        {!q.data && <li><LoadState error={q.error} onRetry={q.reload} compact /></li>}
        {q.data?.length === 0 && <li className="muted" style={{ padding: '12px 0' }}>No comments yet. Say something about EP {ep}.</li>}
        {q.data?.map((c) => (
          <li key={c.id} className="row" style={{ alignItems: 'flex-start' }}>
            <Avatar initial={c.initial} color={c.color} />
            <div className="stack gap-6" style={{ flex: 1, minWidth: 0 }}>
              <span className="small muted" style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ lineHeight: 1.45, overflowWrap: 'anywhere' }}>{c.text}</span>
              <span className="row tiny faint" style={{ gap: 14 }}>
                {fmtDate(c.at)}
                {c.mine
                  ? <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 24, padding: 0, fontSize: 12 }} onClick={() => remove(c.id)}>Delete</button>
                  : <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 24, padding: 0, fontSize: 12 }} aria-expanded={reporting === c.id} onClick={() => setReporting(reporting === c.id ? 0 : c.id)}>Report</button>}
              </span>
              {reporting === c.id && (
                <div className="chips" role="group" aria-label="Why are you reporting this?">
                  {REPORT_REASONS.map(([key, label]) => <button key={key} type="button" className="chip" style={{ minHeight: 30, fontSize: 13 }} onClick={() => report(c.id, key)}>{label}</button>)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {me?.user.signedIn ? (
        me.muted ? <p className="small muted" style={{ margin: 0 }}>You can&apos;t comment for now. A moderator muted your account.</p> : (
          <form className="row" style={{ alignItems: 'flex-end', gap: 8, borderTop: '1px solid var(--surface-2)', paddingTop: 10 }} onSubmit={(e) => { e.preventDefault(); void post() }}>
            <label style={{ flex: 1, minHeight: 42, borderRadius: 21, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <textarea rows={1} aria-label="Add a comment" placeholder="Add a comment…" value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
                style={{ flex: 1, resize: 'none', background: 'none', border: 'none', outline: 'none', fontSize: 15, lineHeight: '20px', padding: '11px 0', maxHeight: 100, fieldSizing: 'content' } as React.CSSProperties} />
            </label>
            <button type="submit" className="icon-btn" aria-label="Send" disabled={!draft.trim() || busy} style={{ color: draft.trim() ? 'var(--accent)' : '#4A4350' }}><Icon name="send" size={22} /></button>
          </form>
        )
      ) : (
        <Link href="/login/" className="btn btn-secondary btn-block">Sign in to comment</Link>
      )}
    </>
  )
}

export function Player() {
  const id = useRouteId(1)
  const q = useApi<{ drama: Drama; episodes: Episode[] }>(id && id !== '_' ? `/dramas/${encodeURIComponent(id)}` : null)
  const { me } = useMe()
  if (!q.data || !me) {
    const notFound = q.error?.status === 404
    return (
      <div className="player-wrap"><div className="player" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {notFound
          ? <div className="empty"><h2>This drama isn&apos;t available</h2><Link href="/" className="btn btn-primary">Go to Home</Link></div>
          : <LoadState error={q.error} onRetry={q.reload} />}
      </div></div>
    )
  }
  if (q.data.drama.status !== 'Published' || q.data.episodes.length === 0) {
    return (
      <div className="player-wrap"><div className="player" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="empty"><h2>Not out yet</h2><p>{q.data.drama.title} has no episodes to watch yet.</p><Link href={`/drama/${q.data.drama.id}/`} className="btn btn-primary">See details</Link></div>
      </div></div>
    )
  }
  return <PlayerView key={q.data.drama.id} drama={q.data.drama} episodes={q.data.episodes} />
}

function PlayerView({ drama: d, episodes }: { drama: Drama; episodes: Episode[] }) {
  const { me } = useMe()
  const cat = useCatalog()
  const config = useConfig()
  const router = useRouter()
  const params = useSearchParams()
  const [toast, show] = useToast()
  const requested = Number(params.get('ep'))
  const has = (n: number) => episodes.some((e) => e.n === n)
  const startEp = has(requested) ? requested : has(me?.progress[d.id]?.ep ?? 0) ? me!.progress[d.id].ep : episodes[0].n
  const [ep, setEp] = useState(startEp)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState('Auto')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [ad, setAd] = useState<{ ticket: string; left: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const idx = Math.max(0, episodes.findIndex((e) => e.n === ep))
  const [range, setRange] = useState(Math.floor(idx / 30))
  const [topupPack, setTopupPack] = useState(1)
  const [dismissedLockEp, setDismissedLockEp] = useState(0)
  const tRef = useRef(0)
  const watched = useRef(0)
  const video = useRef<HTMLVideoElement>(null)

  const episode = episodes[idx]
  const next = episodes[idx + 1]
  const unlocked = isUnlocked(me, d.id, episode)
  const realVideo = episode.hasVideo && unlocked
  const [measured, setMeasured] = useState<{ ep: number; len: number } | null>(null)
  const len = measured?.ep === ep ? measured.len : episode.length || 90
  const liked = me?.liked.includes(d.id) ?? false
  const saved = me?.saved.includes(d.id) ?? false
  const coins = me?.coins ?? 0
  const adsLeft = me?.ads.left ?? 0
  const packs = config.data?.coinPacks ?? []
  const pack = packs[Math.min(topupPack, packs.length - 1)]
  // A locked episode shows the unlock sheet until the viewer dismisses it for this episode.
  const lockPrompt = !loading && !unlocked && sheet === null && dismissedLockEp !== ep
  const openSheet: Sheet = sheet ?? (lockPrompt ? 'unlock' : null)

  const goEp = (n: number) => {
    tRef.current = 0
    setT(0)
    setLoading(true)
    setVideoError(false)
    setSheet(null)
    setPlaying(true)
    setEp(n)
    setRange(Math.floor(Math.max(0, episodes.findIndex((e) => e.n === n)) / 30))
  }

  // New episode: remember progress, keep the URL shareable, end the short buffering state,
  // and auto-unlock with coins when the viewer opted in.
  useEffect(() => {
    setProgress(d.id, ep).catch(() => {})
    // Plain history update: a router navigation here would re-suspend the page and remount the player.
    const url = `/watch/${d.id}/?ep=${ep}`
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url)
    document.title = `EP ${ep} · ${d.title} · The Ending`
    const timer = setTimeout(() => {
      const m = getMe()
      if (!episode.hasVideo || !isUnlocked(m, d.id, episode)) setLoading(false)
      if (m && !isUnlocked(m, d.id, episode) && m.settings.autoUnlock && m.coins >= d.coinsPerEpisode) {
        unlockWithCoins(d.id, ep).then(() => show(`EP ${ep} unlocked · −${d.coinsPerEpisode} coins`), (e) => show(errorMessage(e)))
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [ep, d, episode, show])

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const active = playing && unlocked && !loading && !offline && !videoError && openSheet === null

  const finished = () => {
    // Episode finished: next episode, or the series-end screen.
    if (!next) setSheet('end')
    else if (me?.settings.autoplay) goEp(next.n)
    else setPlaying(false)
  }

  // Watch time for the "watch 30 minutes" task, reported every 30 seconds of playback.
  const countWatch = useEffectEvent((sec: number) => {
    watched.current += sec
    if (watched.current >= 30) {
      watched.current -= 30
      reportWatch(30).catch(() => {})
    }
  })

  // Episodes without an uploaded video play a timed preview.
  const onTick = useEffectEvent(() => {
    const nextT = Math.min(len, tRef.current + 0.25 * speed)
    tRef.current = nextT
    setT(nextT)
    countWatch(0.25)
    if (nextT >= len) finished()
  })
  useEffect(() => {
    if (!active || realVideo) return
    const timer = setInterval(() => onTick(), 250)
    return () => clearInterval(timer)
  }, [active, realVideo])

  // Real video: follow the play state and speed.
  useEffect(() => {
    const v = video.current
    if (!v || !realVideo) return
    v.playbackRate = speed
    if (active) v.play().catch(() => setPlaying(false))
    else v.pause()
  }, [active, realVideo, speed, ep])
  useEffect(() => {
    if (!realVideo || !active) return
    const timer = setInterval(() => countWatch(1), 1000)
    return () => clearInterval(timer)
  }, [realVideo, active])

  // Rewarded ad countdown, then the server checks the ticket and unlocks.
  useEffect(() => {
    if (sheet !== 'ad' || !ad) return
    const timer = setTimeout(() => {
      if (ad.left > 1) { setAd({ ...ad, left: ad.left - 1 }); return }
      completeAd(ad.ticket).then(() => setSheet('adDone'), (e) => { show(errorMessage(e)); setSheet('unlock') })
    }, 1000)
    return () => clearTimeout(timer)
  }, [sheet, ad, show])

  const seek = (v: number) => {
    tRef.current = v
    setT(v)
    if (video.current && realVideo) video.current.currentTime = v
  }
  const payCoins = async () => {
    if (coins < d.coinsPerEpisode) { setSheet('topup'); return }
    setBusy(true)
    try {
      await unlockWithCoins(d.id, ep)
      setSheet(null)
      setPlaying(true)
      show(`EP ${ep} unlocked · −${d.coinsPerEpisode} coins`)
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const watchAd = async () => {
    setBusy(true)
    try {
      const a = await startAd('unlock', d.id, ep)
      setAd({ ticket: a.ticket, left: a.seconds })
      setSheet('ad')
    } catch (e) {
      show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const closeUnlock = () => { setDismissedLockEp(ep); setSheet(null); setPlaying(false) }
  const toggle = (kind: 'liked' | 'saved', msg?: string) => toggleList(kind, d.id).then(() => msg && show(msg), (e) => show(errorMessage(e)))
  const rate = (value: number, msg: string) => api('/ratings', { method: 'POST', body: { dramaId: d.id, value } }).then(() => show(msg), (e) => show(errorMessage(e)))

  const ranges: [number, number][] = []
  for (let a = 0; a < episodes.length; a += 30) ranges.push([a, Math.min(a + 30, episodes.length)])
  const rangeEps = episodes.slice(...(ranges[range] ?? [0, 0]))
  const others = cat.published.filter((x) => x.id !== d.id && x.episodes > 0)
  const more = others.filter((x) => x.genres.some((g) => d.genres.includes(g))).slice(0, 3)
  const upNext: Drama | undefined = more[0] ?? others[0]
  const status = d.completed ? 'Completed' : 'Ongoing'

  return (
    <div className="player-wrap">
      <div className="player">
        {realVideo ? (
          <video ref={video} key={`${d.id}-${ep}`} className="video" src={`/api/episodes/${encodeURIComponent(d.id)}/${ep}/video`} playsInline preload="auto"
            style={{ objectFit: 'contain', background: '#000000', width: '100%', height: '100%' }}
            onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setMeasured({ ep, len: e.currentTarget.duration }) }}
            onCanPlay={() => setLoading(false)}
            onWaiting={() => setLoading(true)}
            onPlaying={() => setLoading(false)}
            onTimeUpdate={(e) => { tRef.current = e.currentTarget.currentTime; setT(e.currentTarget.currentTime) }}
            onEnded={() => finished()}
            onError={() => { setLoading(false); setVideoError(true) }} />
        ) : (
          <div className="video" role="img" aria-label={`Episode ${ep} video`} style={{ background: d.color }}>
            <div className="o1" style={{ background: d.color2 }} />
            <div className="o2" style={{ background: d.color2, opacity: .7 }} />
            <div className="shade-top" />
            <div className="shade-bottom" />
          </div>
        )}
        <button type="button" className="tap-layer" aria-label={playing ? 'Pause' : 'Play'} onClick={() => unlocked ? setPlaying((p) => !p) : setSheet('unlock')} />
        {!episode.hasVideo && <span className="demo-tag">Preview · no video uploaded for this episode yet</span>}

        {(loading || offline || videoError) && unlocked && (
          <div role={offline || videoError ? 'alert' : 'status'} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40, textAlign: 'center', background: offline || videoError ? '#120E14' : 'transparent' }}>
            {offline || videoError ? (
              <>
                <div className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}><Icon name="alert" size={30} /></div>
                <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800 }}>Can&apos;t play this episode</h2>
                <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.5 }}>Check your connection and try again. Your coins and progress are safe.</p>
                <button type="button" className="btn btn-primary" onClick={() => { setOffline(!navigator.onLine); setVideoError(false); setLoading(true); video.current?.load() }}>Try again</button>
                <Link href="/help/" style={{ minHeight: 44, display: 'flex', alignItems: 'center', fontWeight: 600 }}>Report a problem</Link>
              </>
            ) : (
              <><div className="spinner" /><span style={{ fontWeight: 600 }}>Loading EP {ep}…</span></>
            )}
          </div>
        )}

        {!playing && unlocked && !loading && !offline && !videoError && (
          <button type="button" className="center-play" aria-label="Play" onClick={() => setPlaying(true)}><PlayIcon size={30} /></button>
        )}
        {!unlocked && openSheet === null && (
          <button type="button" onClick={() => setSheet('unlock')} style={{ position: 'absolute', left: 0, right: 0, top: '30%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#FFFFFF' }}>
            <span className="icon-circle" style={{ width: 56, height: 56, background: 'rgba(255,255,255,.12)', color: '#FFFFFF' }}><Icon name="lock" size={26} /></span>
            <span style={{ fontWeight: 700 }}>Episode {ep} is locked · tap to unlock</span>
          </button>
        )}

        <header className="p-top">
          <Link href={`/drama/${d.id}/`} className="icon-btn" aria-label="Back"><Icon name="back" width={2.2} /></Link>
          <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
          <button type="button" className="icon-btn" aria-label="Playback settings" onClick={() => setSheet('settings')}><Icon name="more" size={22} width={3} /></button>
        </header>

        <div className="rail">
          <button type="button" className="rail-btn" aria-pressed={liked} onClick={() => toggle('liked')}>
            <Icon name="heart" size={32} fill={liked ? '#FF3D5E' : 'none'} style={{ color: liked ? '#FF3D5E' : '#FFFFFF' }} />{liked ? 'Liked' : 'Like'}
          </button>
          <button type="button" className="rail-btn" aria-pressed={saved} onClick={() => toggle('saved', saved ? 'Removed from My List' : 'Saved to My List')}>
            <Icon name="bookmark" size={30} fill={saved ? '#FFC46B' : 'none'} style={{ color: saved ? '#FFC46B' : '#FFFFFF' }} />{saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" className="rail-btn" onClick={() => setSheet('comments')}><Icon name="comment" size={30} />Comments</button>
          <button type="button" className="rail-btn" onClick={() => setSheet('share')}><Icon name="share" size={30} />Share</button>
        </div>

        <div className="p-info">
          <div style={{ fontSize: 16, fontWeight: 800 }}>EP {ep}{episode.title ? ` · ${episode.title}` : ''}</div>
          {d.synopsis && <div style={{ fontSize: 14, color: '#E6E0E8', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.synopsis}</div>}
        </div>

        <div className="p-seek">
          <span>{duration(t)}</span>
          <input type="range" min={0} max={Math.max(1, Math.floor(len))} step={1} value={Math.floor(t)} aria-label="Playback position" disabled={!unlocked} onChange={(e) => seek(Number(e.target.value))} />
          <span>{duration(len)}</span>
        </div>

        <div className="p-bottom">
          <button type="button" onClick={() => setSheet('episodes')} style={{ flex: 1, minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#FFFFFF', fontSize: 14, fontWeight: 600, padding: 0 }}>
            <Icon name="grid" size={20} />EP {ep} of {episodes.length} · {status}
            <Icon name="chevronUp" size={16} width={2.4} style={{ marginLeft: 'auto' }} />
          </button>
          <button type="button" onClick={() => setSheet('settings')} className="btn btn-sm" style={{ minHeight: 32, background: 'rgba(255,255,255,.12)', color: '#FFFFFF' }}>{speed}x</button>
        </div>

        {/* ---------- Sheets ---------- */}
        {openSheet === 'episodes' && (
          <SheetFrame title={d.title} label="Episode list" onClose={() => setSheet(null)}>
            <div className="small faint" style={{ marginTop: -10 }}>{episodes.length} episodes · {status}</div>
            {ranges.length > 1 && (
              <div role="tablist" aria-label="Episode range" className="row" style={{ gap: 20, borderBottom: '1px solid var(--surface-2)', flexWrap: 'wrap' }}>
                {ranges.map(([a, b], i) => (
                  <button key={a} type="button" role="tab" aria-selected={range === i} onClick={() => setRange(i)} style={{ background: 'none', border: 'none', padding: '10px 0', fontWeight: 700, color: range === i ? '#FFFFFF' : 'var(--text-3)', boxShadow: range === i ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{episodes[a].n}–{episodes[b - 1].n}</button>
                ))}
              </div>
            )}
            <div className="ep-grid">
              {rangeEps.map((e) => {
                const locked = !isUnlocked(me, d.id, e)
                return (
                  <button key={e.n} type="button" aria-label={`Episode ${e.n}${e.n === ep ? ', playing' : ''}${locked ? ', locked' : ''}`} onClick={() => goEp(e.n)}
                    className={`ep-cell${e.n === ep ? ' current' : e.n < ep ? ' watched' : ''}`}>
                    {e.n}
                    {locked && <span className="lock" style={{ color: 'var(--text-3)' }}><Icon name="lock" size={11} width={2.6} /></span>}
                  </button>
                )
              })}
            </div>
          </SheetFrame>
        )}

        {openSheet === 'unlock' && (
          <SheetFrame title={`Unlock EP ${ep}`} onClose={closeUnlock}>
            <Link href="/wallet/" className="row small" style={{ color: '#FFFFFF', textDecoration: 'none', marginTop: -8 }}><Coin />Balance <strong>{coins}</strong></Link>
            <button type="button" className="btn btn-primary btn-block" style={{ minHeight: 54 }} disabled={busy} onClick={payCoins}>
              <Coin />{coins >= d.coinsPerEpisode ? `Unlock for ${d.coinsPerEpisode} coins` : `Top up to unlock · ${d.coinsPerEpisode} coins`}
            </button>
            <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 54 }} disabled={adsLeft === 0 || busy} onClick={watchAd}>
              <Icon name="ad" size={20} />{adsLeft > 0 ? <>Watch a short ad · free <span className="faint" style={{ fontWeight: 500 }}>{adsLeft} left today</span></> : 'No free ad unlocks left today'}
            </button>
            <Link href="/vip/" className="row" style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--gold-bg)', color: 'var(--gold)', textDecoration: 'none' }}>
              <CrownIcon size={26} />
              <span className="stack" style={{ flex: 1, gap: 2 }}><strong>Join VIP · watch everything</strong><span className="small" style={{ color: '#D9B571' }}>All episodes unlocked, no ads, 1080p</span></span>
              <Icon name="chevron" size={16} width={2.4} />
            </Link>
            <div className="row between" style={{ minHeight: 44 }}>
              <span className="small muted">Auto-unlock next episodes with coins</span>
              <Switch label="Auto-unlock next episodes with coins" checked={me?.settings.autoUnlock ?? false} onChange={(v) => setSetting('autoUnlock', v).catch((e) => show(errorMessage(e)))} />
            </div>
          </SheetFrame>
        )}

        {openSheet === 'topup' && (
          <SheetFrame title="Not enough coins" onClose={() => setSheet('unlock')}>
            <p className="muted" style={{ margin: '-10px 0 0' }}>EP {ep} needs {d.coinsPerEpisode} coins. You have {coins}.</p>
            {!me?.user.signedIn && <p className="small" style={{ margin: 0, color: 'var(--warn)' }}>Sign in first so your coins stay with your account.</p>}
            <div role="radiogroup" aria-label="Coin packs" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {packs.map((p, i) => (
                <button key={p.id} type="button" role="radio" aria-checked={topupPack === i} onClick={() => setTopupPack(i)}
                  style={{ position: 'relative', minHeight: 96, borderRadius: 14, border: `2px solid ${topupPack === i ? '#FF5C7A' : 'transparent'}`, background: topupPack === i ? 'var(--accent-soft)' : 'var(--surface-2)', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {p.tag && <span style={{ position: 'absolute', top: -1, right: -1, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: '0 12px 0 8px', background: 'var(--primary)' }}>{p.tag}</span>}
                  <span className="row" style={{ gap: 5, fontSize: 18, fontWeight: 800 }}><Coin size={16} />{p.coins}</span>
                  {p.bonus > 0 && <span className="tiny" style={{ color: '#FFC46B', fontWeight: 700 }}>+{p.bonus} bonus</span>}
                  <span className="small muted">{price(p.priceCents)}</span>
                </button>
              ))}
            </div>
            {pack && (
              <Link className="btn btn-primary btn-block" href={me?.user.signedIn ? `/payment/?product=${pack.id}&return=${encodeURIComponent(`/watch/${d.id}/?ep=${ep}`)}` : '/login/'}>
                {me?.user.signedIn ? `Buy ${pack.coins + pack.bonus} coins · ${price(pack.priceCents)}` : 'Sign in to buy coins'}
              </Link>
            )}
            <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} disabled={adsLeft === 0 || busy} onClick={watchAd}>Watch an ad instead</button>
              <Link href="/vip/" className="btn btn-ghost btn-sm" style={{ color: 'var(--gold)' }}>Get VIP</Link>
            </div>
            <p className="tiny faint" style={{ margin: 0, textAlign: 'center' }}>Demo checkout: no real payment is made. In the apps this goes through Google Play or the App Store.</p>
          </SheetFrame>
        )}

        {openSheet === 'ad' && ad && (
          <div className="backdrop center" style={{ background: '#000000' }} role="dialog" aria-modal="true" aria-label="Sponsored video">
            <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
              <span className="tiny faint">Sponsored · demo ad</span>
              <div style={{ width: 220, aspectRatio: '9 / 16', borderRadius: 16, background: '#1E2533', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)', fontWeight: 700 }}>Your ad here</div>
              <span role="status" style={{ fontWeight: 700 }}>Reward in {ad.left}s</span>
            </div>
          </div>
        )}

        {openSheet === 'adDone' && (
          <div className="backdrop center">
            <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ar">
              <div className="icon-circle"><Icon name="check" size={30} width={2.6} /></div>
              <h2 id="ar">EP {ep} unlocked</h2>
              <p>Thanks for watching. You have {adsLeft} free ad {adsLeft === 1 ? 'unlock' : 'unlocks'} left today.</p>
              <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => { setSheet(null); setPlaying(true) }}>Play EP {ep}</button>
            </div>
          </div>
        )}

        {openSheet === 'comments' && (
          <SheetFrame title={`Comments on EP ${ep}`} onClose={() => setSheet(null)}>
            <Comments drama={d} ep={ep} show={show} />
          </SheetFrame>
        )}

        {openSheet === 'share' && (
          <SheetFrame title={`Share EP ${ep}`} onClose={() => setSheet(null)}>
            <Link href="/rewards/" className="row" style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--accent-soft)', color: '#FFFFFF', textDecoration: 'none' }}>
              <Icon name="gift" size={26} style={{ color: 'var(--accent)' }} />
              <span className="stack" style={{ flex: 1, gap: 2 }}><strong>Invite a friend, both get {config.data?.tasks.invite ?? 50} coins</strong><span className="small muted">{me?.user.signedIn ? 'Your share link carries your invite' : 'Sign in so your link carries your invite'}</span></span>
            </Link>
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="btn btn-primary btn-block" onClick={() => shareDrama(d, show)}><Icon name="share" size={18} />Share…</button>
              <button type="button" className="btn btn-secondary btn-block" onClick={async () => { try { await navigator.clipboard.writeText(dramaLink(d)); show('Link copied') } catch { show('Copy not available') } }}>Copy link</button>
            </div>
          </SheetFrame>
        )}

        {openSheet === 'settings' && (
          <SheetFrame title="Playback" onClose={() => setSheet(null)}>
            {[['Speed', SPEEDS.map((x) => `${x}x`), `${speed}x`], ['Quality', QUALITIES, quality]].map(([name, opts, value]) => (
              <div key={name as string} className="stack gap-8">
                <span className="small muted" style={{ fontWeight: 600 }}>{name as string}</span>
                <div role="radiogroup" aria-label={name as string} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
                  {(opts as string[]).map((o) => {
                    const vipOnly = name === 'Quality' && (o === '1080p' || o === '4K')
                    return (
                      <button key={o} type="button" role="radio" aria-checked={value === o}
                        onClick={() => {
                          if (name === 'Speed') setSpeed(parseFloat(o))
                          else if (vipOnly && !vipActive(me)) show('1080p and 4K are for VIP')
                          else setQuality(o)
                        }}
                        style={{ minHeight: 40, borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, background: value === o ? 'var(--primary)' : 'var(--surface-2)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        {o}{vipOnly && <span style={{ fontSize: 9, fontWeight: 800, color: '#2A1A00', background: 'var(--gold)', padding: '1px 4px', borderRadius: 4 }}>VIP</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="tiny faint" style={{ margin: 0 }}>Uploaded videos play at their original quality; Auto picks the best your connection allows.</p>
            <div className="row between" style={{ minHeight: 44 }}>
              <span className="stack" style={{ gap: 2 }}><span style={{ fontWeight: 600 }}>Autoplay next episode</span><span className="small faint">A locked episode asks before playing</span></span>
              <Switch label="Autoplay next episode" checked={me?.settings.autoplay ?? true} onChange={(v) => setSetting('autoplay', v).catch((e) => show(errorMessage(e)))} />
            </div>
            <Link href="/help/" className="list-row" style={{ borderBottom: 'none' }}><span className="grow" style={{ fontWeight: 600 }}>Report a playback problem</span><Icon name="chevron" size={16} width={2.4} style={{ color: 'var(--text-3)' }} /></Link>
          </SheetFrame>
        )}

        {openSheet === 'end' && (
          <div className="backdrop" style={{ background: 'var(--bg)', alignItems: 'stretch', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-labelledby="end">
            <div className="stack gap-24" style={{ width: '100%', maxWidth: 480, padding: '8px 20px 40px' }}>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => router.push(`/drama/${d.id}/`)} style={{ marginLeft: -12 }}><Icon name="close" size={22} width={2.2} /></button>
              <div className="stack gap-6">
                <span className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>{d.completed ? `The End · ${episodes.length} of ${episodes.length} watched` : `You're caught up · ${episodes.length} episodes so far`}</span>
                <h1 id="end" style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.25 }}>{d.completed ? `You finished ${d.title}` : `More of ${d.title} is coming`}</h1>
              </div>
              <div className="row">
                <span className="muted" style={{ flex: 1 }}>Did you enjoy it?</span>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => rate(1, 'Thanks for rating')}>Loved it</button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => rate(-1, 'Thanks, we’ll tune your picks')}>Not for me</button>
              </div>
              {upNext && (
                <section aria-labelledby="un" className="stack gap-12">
                  <h2 id="un" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Up next</h2>
                  <Link href={`/watch/${upNext.id}/?ep=1`} className="row" style={{ alignItems: 'stretch', gap: 14, color: '#FFFFFF', textDecoration: 'none' }}>
                    <div style={{ width: 120, flex: 'none' }}><Poster drama={upNext} showEps={false} /></div>
                    <div className="stack gap-6" style={{ flex: 1 }}>
                      <strong style={{ fontSize: 17 }}>{upNext.title}</strong>
                      <span className="small faint">{[...upNext.genres.slice(0, 2), `${upNext.episodes} EP`].join(' · ')}</span>
                      <span className="small" style={{ marginTop: 'auto', color: 'var(--accent)', fontWeight: 700 }}>Play EP 1 ›</span>
                    </div>
                  </Link>
                </section>
              )}
              {more.length > 1 && (
                <section aria-labelledby="ml" className="stack gap-12">
                  <h2 id="ml" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>More like this</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    {more.map((m) => <Link key={m.id} href={`/drama/${m.id}/`} className="card-link"><Poster drama={m} badge={false} /><span className="card-title">{m.title}</span></Link>)}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
        {toast}
      </div>
    </div>
  )
}
