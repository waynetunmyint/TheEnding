'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useToast } from '@/components/shell'
import { Avatar, Coin, CrownIcon, Icon, PlayIcon, Poster, Switch } from '@/components/ui'
import { COIN_PACKS, COMMENTS, PUBLISHED, episodeLength, episodeTitle, formatTime, getDrama, type Drama } from '@/data/dummy'
import {
  adsLeft, getDemo, isUnlocked, setProgress, toggleIn, unlockWithAd, unlockWithCoins, update, useDemo, today,
} from '@/lib/demo-store'
import { shareDrama } from '@/lib/share'

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

export function Player({ id }: { id: string }) {
  const d = getDrama(id)!
  const s = useDemo()
  const router = useRouter()
  const params = useSearchParams()
  const [toast, show] = useToast()
  const requested = Number(params.get('ep'))
  const startEp = requested >= 1 && requested <= d.episodes ? requested : (s.progress[d.id]?.ep ?? 1)
  const [ep, setEp] = useState(startEp)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState('Auto')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [adLeftSec, setAdLeftSec] = useState(5)
  const [range, setRange] = useState(Math.floor((startEp - 1) / 30))
  const [myComments, setMyComments] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [topupPack, setTopupPack] = useState(1)

  const [dismissedLockEp, setDismissedLockEp] = useState(0)
  const tRef = useRef(0)

  const len = episodeLength(ep)
  const unlocked = isUnlocked(s, d.id, ep)
  const liked = s.liked.includes(d.id)
  const saved = s.saved.includes(d.id)
  // A locked episode shows the unlock sheet until the viewer dismisses it for this episode.
  const lockPrompt = !loading && !unlocked && sheet === null && dismissedLockEp !== ep
  const openSheet: Sheet = sheet ?? (lockPrompt ? 'unlock' : null)

  const goEp = (n: number) => {
    tRef.current = 0
    setT(0)
    setLoading(true)
    setSheet(null)
    setPlaying(true)
    setEp(n)
    setRange(Math.floor((n - 1) / 30))
  }

  // New episode: remember progress, keep the URL shareable, end the short buffering state,
  // and auto-unlock with coins when the viewer opted in.
  useEffect(() => {
    setProgress(d.id, ep)
    router.replace(`/watch/${d.id}/?ep=${ep}`, { scroll: false })
    const timer = setTimeout(() => {
      setLoading(false)
      const st = getDemo()
      if (!isUnlocked(st, d.id, ep) && st.settings.autoUnlock && st.coins >= d.coinsPerEpisode && unlockWithCoins(d.id, ep)) {
        show(`EP ${ep} unlocked · −${d.coinsPerEpisode} coins`)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [ep, d, router, show])

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const active = playing && unlocked && !loading && !offline && openSheet === null
  const onTick = useEffectEvent(() => {
    const next = Math.min(len, tRef.current + 0.25 * speed)
    tRef.current = next
    setT(next)
    if (next < len) return
    // Episode finished: next episode, or the series-end screen.
    if (ep >= d.episodes) setSheet('end')
    else if (s.settings.autoplay) goEp(ep + 1)
    else setPlaying(false)
  })
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => onTick(), 250)
    return () => clearInterval(timer)
  }, [active])

  // Rewarded ad countdown.
  useEffect(() => {
    if (sheet !== 'ad') return
    const timer = setTimeout(() => {
      if (adLeftSec <= 1) {
        unlockWithAd(d.id, ep)
        setSheet('adDone')
      } else {
        setAdLeftSec(adLeftSec - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [sheet, adLeftSec, d.id, ep])

  const seek = (v: number) => { tRef.current = v; setT(v) }
  const payCoins = () => {
    if (s.coins < d.coinsPerEpisode) { setSheet('topup'); return }
    if (unlockWithCoins(d.id, ep)) { setSheet(null); setPlaying(true); show(`EP ${ep} unlocked · −${d.coinsPerEpisode} coins`) }
  }
  const startAd = () => { setAdLeftSec(5); setSheet('ad') }
  const closeUnlock = () => { setDismissedLockEp(ep); setSheet(null); setPlaying(false) }

  const ranges: [number, number][] = []
  for (let a = 1; a <= d.episodes; a += 30) ranges.push([a, Math.min(a + 29, d.episodes)])
  const rangeEps: number[] = []
  for (let n = ranges[range][0]; n <= ranges[range][1]; n++) rangeEps.push(n)
  const more = PUBLISHED.filter((x) => x.id !== d.id && x.genres.some((g) => d.genres.includes(g))).slice(0, 3)
  const upNext: Drama | undefined = more[0] ?? PUBLISHED.find((x) => x.id !== d.id)

  return (
    <div className="player-wrap">
      <div className="player">
        <div className="video" role="img" aria-label={`Episode ${ep} video`} style={{ background: d.color }}>
          <div className="o1" style={{ background: d.color2 }} />
          <div className="o2" style={{ background: d.color2, opacity: .7 }} />
          <div className="shade-top" />
          <div className="shade-bottom" />
        </div>
        <button type="button" className="tap-layer" aria-label={playing ? 'Pause' : 'Play'} onClick={() => unlocked ? setPlaying((p) => !p) : setSheet('unlock')} />
        <span className="demo-tag">Video preview (demo) · {quality}</span>

        {(loading || offline) && (
          <div role={offline ? 'alert' : 'status'} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40, textAlign: 'center', background: offline ? '#120E14' : 'transparent' }}>
            {offline ? (
              <>
                <div className="icon-circle" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}><Icon name="alert" size={30} /></div>
                <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800 }}>Can&apos;t play this episode</h2>
                <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.5 }}>Check your connection and try again. Your coins and progress are safe.</p>
                <button type="button" className="btn btn-primary" onClick={() => setOffline(!navigator.onLine)}>Try again</button>
                <Link href="/help/" style={{ minHeight: 44, display: 'flex', alignItems: 'center', fontWeight: 600 }}>Report a problem</Link>
              </>
            ) : (
              <><div className="spinner" /><span style={{ fontWeight: 600 }}>Loading EP {ep}…</span></>
            )}
          </div>
        )}

        {!playing && unlocked && !loading && !offline && (
          <button type="button" className="center-play" aria-label="Play" onClick={() => setPlaying(true)}><PlayIcon size={30} /></button>
        )}
        {!unlocked && !loading && openSheet === null && (
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
          <button type="button" className="rail-btn" aria-pressed={liked} onClick={() => toggleIn('liked', d.id)}>
            <Icon name="heart" size={32} fill={liked ? '#FF3D5E' : 'none'} style={{ color: liked ? '#FF3D5E' : '#FFFFFF' }} />{liked ? 'Liked' : 'Like'}
          </button>
          <button type="button" className="rail-btn" aria-pressed={saved} onClick={() => { toggleIn('saved', d.id); show(saved ? 'Removed from My List' : 'Saved to My List') }}>
            <Icon name="bookmark" size={30} fill={saved ? '#FFC46B' : 'none'} style={{ color: saved ? '#FFC46B' : '#FFFFFF' }} />{saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" className="rail-btn" onClick={() => setSheet('comments')}><Icon name="comment" size={30} />Comments</button>
          <button type="button" className="rail-btn" onClick={() => setSheet('share')}><Icon name="share" size={30} />Share</button>
        </div>

        <div className="p-info">
          <div style={{ fontSize: 16, fontWeight: 800 }}>EP {ep} · {episodeTitle(ep)}</div>
          <div style={{ fontSize: 14, color: '#E6E0E8', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.synopsis}</div>
        </div>

        <div className="p-seek">
          <span>{formatTime(t)}</span>
          <input type="range" min={0} max={len} step={1} value={Math.floor(t)} aria-label="Playback position" disabled={!unlocked} onChange={(e) => seek(Number(e.target.value))} />
          <span>{formatTime(len)}</span>
        </div>

        <div className="p-bottom">
          <button type="button" onClick={() => setSheet('episodes')} style={{ flex: 1, minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#FFFFFF', fontSize: 14, fontWeight: 600, padding: 0 }}>
            <Icon name="grid" size={20} />EP {ep} of {d.episodes} · {d.completed ? 'Completed' : 'Ongoing'}
            <Icon name="chevronUp" size={16} width={2.4} style={{ marginLeft: 'auto' }} />
          </button>
          <button type="button" onClick={() => setSheet('settings')} className="btn btn-sm" style={{ minHeight: 32, background: 'rgba(255,255,255,.12)', color: '#FFFFFF' }}>{speed}x</button>
        </div>

        {/* ---------- Sheets ---------- */}
        {openSheet === 'episodes' && (
          <SheetFrame title={d.title} label="Episode list" onClose={() => setSheet(null)}>
            <div className="small faint" style={{ marginTop: -10 }}>{d.episodes} episodes · {d.completed ? 'Completed' : 'Ongoing'}</div>
            {ranges.length > 1 && (
              <div role="tablist" aria-label="Episode range" className="row" style={{ gap: 20, borderBottom: '1px solid var(--surface-2)' }}>
                {ranges.map(([a, b], i) => (
                  <button key={a} type="button" role="tab" aria-selected={range === i} onClick={() => setRange(i)} style={{ background: 'none', border: 'none', padding: '10px 0', fontWeight: 700, color: range === i ? '#FFFFFF' : 'var(--text-3)', boxShadow: range === i ? 'inset 0 -2px 0 #FF3D5E' : 'none' }}>{a}–{b}</button>
                ))}
              </div>
            )}
            <div className="ep-grid">
              {rangeEps.map((n) => {
                const locked = !isUnlocked(s, d.id, n)
                return (
                  <button key={n} type="button" aria-label={`Episode ${n}${n === ep ? ', playing' : ''}${locked ? ', locked' : ''}`} onClick={() => goEp(n)}
                    className={`ep-cell${n === ep ? ' current' : n < ep ? ' watched' : ''}`}>
                    {n}
                    {locked && <span className="lock" style={{ color: 'var(--text-3)' }}><Icon name="lock" size={11} width={2.6} /></span>}
                  </button>
                )
              })}
            </div>
          </SheetFrame>
        )}

        {openSheet === 'unlock' && (
          <SheetFrame title={`Unlock EP ${ep}`} onClose={closeUnlock}>
            <Link href="/wallet/" className="row small" style={{ color: '#FFFFFF', textDecoration: 'none', marginTop: -8 }}><Coin />Balance <strong>{s.coins}</strong></Link>
            <button type="button" className="btn btn-primary btn-block" style={{ minHeight: 54 }} onClick={payCoins}>
              <Coin />{s.coins >= d.coinsPerEpisode ? `Unlock for ${d.coinsPerEpisode} coins` : `Top up to unlock · ${d.coinsPerEpisode} coins`}
            </button>
            <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 54 }} disabled={adsLeft(s) === 0} onClick={startAd}>
              <Icon name="ad" size={20} />{adsLeft(s) > 0 ? <>Watch a short ad · free <span className="faint" style={{ fontWeight: 500 }}>{adsLeft(s)} left today</span></> : 'No free ad unlocks left today'}
            </button>
            <Link href="/vip/" className="row" style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--gold-bg)', color: 'var(--gold)', textDecoration: 'none' }}>
              <CrownIcon size={26} />
              <span className="stack" style={{ flex: 1, gap: 2 }}><strong>Join VIP · watch everything</strong><span className="small" style={{ color: '#D9B571' }}>All episodes unlocked, no ads, 1080p</span></span>
              <Icon name="chevron" size={16} width={2.4} />
            </Link>
            <div className="row between" style={{ minHeight: 44 }}>
              <span className="small muted">Auto-unlock next episodes with coins</span>
              <Switch label="Auto-unlock next episodes with coins" checked={s.settings.autoUnlock} onChange={(v) => update((x) => ({ ...x, settings: { ...x.settings, autoUnlock: v } }))} />
            </div>
          </SheetFrame>
        )}

        {openSheet === 'topup' && (
          <SheetFrame title="Not enough coins" onClose={() => setSheet('unlock')}>
            <p className="muted" style={{ margin: '-10px 0 0' }}>EP {ep} needs {d.coinsPerEpisode} coins. You have {s.coins}.</p>
            <div role="radiogroup" aria-label="Coin packs" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {COIN_PACKS.map((p, i) => (
                <button key={p.id} type="button" role="radio" aria-checked={topupPack === i} onClick={() => setTopupPack(i)}
                  style={{ position: 'relative', minHeight: 96, borderRadius: 14, border: `2px solid ${topupPack === i ? '#FF5C7A' : 'transparent'}`, background: topupPack === i ? 'var(--accent-soft)' : 'var(--surface-2)', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {p.tag && <span style={{ position: 'absolute', top: -1, right: -1, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: '0 12px 0 8px', background: 'var(--primary)' }}>{p.tag}</span>}
                  <span className="row" style={{ gap: 5, fontSize: 18, fontWeight: 800 }}><Coin size={16} />{p.coins}</span>
                  {p.bonus > 0 && <span className="tiny" style={{ color: '#FFC46B', fontWeight: 700 }}>+{p.bonus} bonus</span>}
                  <span className="small muted">{p.price}</span>
                </button>
              ))}
            </div>
            <Link className="btn btn-primary btn-block" href={`/payment/?status=success&pack=${COIN_PACKS[topupPack].id}&return=${encodeURIComponent(`/watch/${d.id}/?ep=${ep}`)}`}>
              Buy {COIN_PACKS[topupPack].coins + COIN_PACKS[topupPack].bonus} coins · {COIN_PACKS[topupPack].price}
            </Link>
            <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} disabled={adsLeft(s) === 0} onClick={startAd}>Watch an ad instead</button>
              <Link href="/vip/" className="btn btn-ghost btn-sm" style={{ color: 'var(--gold)' }}>Get VIP</Link>
            </div>
            <p className="tiny faint" style={{ margin: 0, textAlign: 'center' }}>Demo: no real payment is made. In the app this goes through Google Play or the App Store.</p>
          </SheetFrame>
        )}

        {openSheet === 'ad' && (
          <div className="backdrop center" style={{ background: '#000000' }} role="dialog" aria-modal="true" aria-label="Sponsored video">
            <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
              <span className="tiny faint">Sponsored · demo ad</span>
              <div style={{ width: 220, aspectRatio: '9 / 16', borderRadius: 16, background: '#1E2533', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)', fontWeight: 700 }}>Your ad here</div>
              <span role="status" style={{ fontWeight: 700 }}>Reward in {adLeftSec}s</span>
            </div>
          </div>
        )}

        {openSheet === 'adDone' && (
          <div className="backdrop center">
            <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ar">
              <div className="icon-circle"><Icon name="check" size={30} width={2.6} /></div>
              <h2 id="ar">EP {ep} unlocked</h2>
              <p>Thanks for watching. You have {adsLeft(s)} free ad {adsLeft(s) === 1 ? 'unlock' : 'unlocks'} left today.</p>
              <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => { setSheet(null); setPlaying(true) }}>Play EP {ep}</button>
            </div>
          </div>
        )}

        {openSheet === 'comments' && (
          <SheetFrame title={`Comments on EP ${ep}`} onClose={() => setSheet(null)}>
            <ul className="list stack gap-16" style={{ maxHeight: '48dvh', overflowY: 'auto' }}>
              {myComments.map((c, i) => (
                <li key={`me-${i}`} className="row" style={{ alignItems: 'flex-start' }}>
                  <Avatar initial={s.user.name[0]} color="#7A3546" />
                  <div className="stack gap-6" style={{ flex: 1 }}><span className="small muted" style={{ fontWeight: 600 }}>{s.signedIn ? s.user.name : 'You'}</span><span style={{ lineHeight: 1.45 }}>{c}</span><span className="tiny faint">{today()}</span></div>
                </li>
              ))}
              {COMMENTS.map((c) => (
                <li key={c.name} className="row" style={{ alignItems: 'flex-start' }}>
                  <Avatar initial={c.initial} color={c.color} />
                  <div className="stack gap-6" style={{ flex: 1 }}><span className="small muted" style={{ fontWeight: 600 }}>{c.name}</span><span style={{ lineHeight: 1.45 }}>{c.text}</span><span className="tiny faint">{c.date}</span></div>
                </li>
              ))}
            </ul>
            <form className="row" style={{ alignItems: 'flex-end', gap: 8, borderTop: '1px solid var(--surface-2)', paddingTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setMyComments((m) => [draft.trim(), ...m]); setDraft('') } }}>
              <label style={{ flex: 1, minHeight: 42, borderRadius: 21, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                <textarea rows={1} aria-label="Add a comment" placeholder="Add a comment…" value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
                  style={{ flex: 1, resize: 'none', background: 'none', border: 'none', outline: 'none', fontSize: 15, lineHeight: '20px', padding: '11px 0', maxHeight: 100, fieldSizing: 'content' } as React.CSSProperties} />
              </label>
              <button type="submit" className="icon-btn" aria-label="Send" disabled={!draft.trim()} style={{ color: draft.trim() ? 'var(--accent)' : '#4A4350' }}><Icon name="send" size={22} /></button>
            </form>
          </SheetFrame>
        )}

        {openSheet === 'share' && (
          <SheetFrame title={`Share EP ${ep}`} onClose={() => setSheet(null)}>
            <Link href="/rewards/" className="row" style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--accent-soft)', color: '#FFFFFF', textDecoration: 'none' }}>
              <Icon name="gift" size={26} style={{ color: 'var(--accent)' }} />
              <span className="stack" style={{ flex: 1, gap: 2 }}><strong>Invite a friend, both get 50 coins</strong><span className="small muted">When they sign up with your link</span></span>
            </Link>
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="btn btn-primary btn-block" onClick={() => shareDrama(d, show)}><Icon name="share" size={18} />Share…</button>
              <button type="button" className="btn btn-secondary btn-block" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/drama/${d.id}/`); show('Link copied') } catch { show('Copy not available') } }}>Copy link</button>
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
                          else if (vipOnly && !s.vip) show('1080p and 4K are for VIP')
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
            <div className="row between" style={{ minHeight: 44 }}>
              <span className="stack" style={{ gap: 2 }}><span style={{ fontWeight: 600 }}>Autoplay next episode</span><span className="small faint">Stops before a locked episode</span></span>
              <Switch label="Autoplay next episode" checked={s.settings.autoplay} onChange={(v) => update((x) => ({ ...x, settings: { ...x.settings, autoplay: v } }))} />
            </div>
            <Link href="/help/" className="list-row" style={{ borderBottom: 'none' }}><span className="grow" style={{ fontWeight: 600 }}>Report a playback problem</span><Icon name="chevron" size={16} width={2.4} style={{ color: 'var(--text-3)' }} /></Link>
          </SheetFrame>
        )}

        {openSheet === 'end' && (
          <div className="backdrop" style={{ background: 'var(--bg)', alignItems: 'stretch', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-labelledby="end">
            <div className="stack gap-24" style={{ width: '100%', maxWidth: 480, padding: '8px 20px 40px' }}>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => router.push(`/drama/${d.id}/`)} style={{ marginLeft: -12 }}><Icon name="close" size={22} width={2.2} /></button>
              <div className="stack gap-6">
                <span className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>The End · {d.episodes} of {d.episodes} watched</span>
                <h1 id="end" style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.25 }}>You finished {d.title}</h1>
              </div>
              <div className="row">
                <span className="muted" style={{ flex: 1 }}>Did you enjoy it?</span>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => show('Thanks for rating')}>Loved it</button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => show('Thanks, we’ll tune your picks')}>Not for me</button>
              </div>
              {upNext && (
                <section aria-labelledby="un" className="stack gap-12">
                  <h2 id="un" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Up next</h2>
                  <Link href={`/watch/${upNext.id}/?ep=1`} className="row" style={{ alignItems: 'stretch', gap: 14, color: '#FFFFFF', textDecoration: 'none' }}>
                    <div style={{ width: 120, flex: 'none' }}><Poster drama={upNext} showEps={false} /></div>
                    <div className="stack gap-6" style={{ flex: 1 }}>
                      <strong style={{ fontSize: 17 }}>{upNext.title}</strong>
                      <span className="small faint">{upNext.genres.slice(0, 2).join(' · ')} · {upNext.episodes} EP</span>
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
