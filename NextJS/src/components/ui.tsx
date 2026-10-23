import type { CSSProperties, ReactNode } from 'react'
import type { Drama } from '@/lib/types'

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  shorts: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="m10 9 5 3-5 3z" /></>,
  gift: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8C10 4 6 4 6 6.5S9 8 12 8zm0 0c2-4 6-4 6-1.5S15 8 12 8z" /></>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  share: <path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  comment: <path d="M4 5h16v11H9l-5 4z" />,
  ad: <><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M8 21h8M10 9l4 2.5-4 2.5z" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>,
  wifiOff: <path d="M3 3l18 18M8.5 12.6a5 5 0 0 1 5.6-1M5 9.2A10 10 0 0 1 9.4 6.6M19 9.2a10 10 0 0 0-4.6-2.7M12 18h.01" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M4 12 20 4l-6 16-3-7z" />,
  warn: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></>,
  drag: <><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>,
}

export function Icon({ name, size = 24, width = 2, style, fill = 'none' }: { name: string; size?: number; width?: number; style?: CSSProperties; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      {PATHS[name]}
    </svg>
  )
}

export function PlayIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill={color} /></svg>
}

export function CrownIcon({ size = 18, color = '#F2C46D' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill={color} /></svg>
}

export function FlameIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF5C7A" aria-hidden="true"><path d="M12 2c1 4 6 5.5 6 11a6 6 0 0 1-12 0c0-3 1.6-4.6 2.6-6.5.6 1.6 1.4 2.6 2.6 3.2C11 7 11 4.5 12 2z" /></svg>
}

export function Coin({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#FFB020" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#B26F00" strokeWidth="1.6" />
    </svg>
  )
}

const BADGE_COLORS: Record<string, [string, string]> = {
  Hot: ['#E0245E', '#FFFFFF'],
  New: ['#1D64D8', '#FFFFFF'],
  Exclusive: ['#F2C46D', '#2A1A00'],
}

export function Poster({ drama, rank, progress, showEps = true, badge = true }: { drama: Drama; rank?: number; progress?: number; showEps?: boolean; badge?: boolean }) {
  const colors = drama.badge ? BADGE_COLORS[drama.badge] : undefined
  return (
    <div className="poster" style={{ background: drama.color }}>
      {drama.poster
        ? <img src={drama.poster} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div className="orb" style={{ background: drama.color2 }} />}
      {badge && colors && <span className="badge" style={{ background: colors[0], color: colors[1] }}>{drama.badge}</span>}
      {rank !== undefined && <span className="rank">{rank}</span>}
      {showEps && rank === undefined && progress === undefined && drama.episodes > 0 && <span className="eps">{drama.episodes} EP</span>}
      {progress !== undefined && <div className="progress"><span style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} /></div>}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)} />
}

export function Avatar({ initial, color, size = 36 }: { initial: string; color: string; size?: number }) {
  return (
    <span aria-hidden="true" style={{ flex: 'none', width: size, height: size, borderRadius: size / 2, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.4), fontWeight: 800 }}>
      {initial}
    </span>
  )
}
