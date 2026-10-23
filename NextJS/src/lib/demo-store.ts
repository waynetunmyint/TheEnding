'use client'

import { useSyncExternalStore } from 'react'
import { AD_UNLOCKS_PER_DAY, CHECKIN_AMOUNTS, getDrama } from '@/data/dummy'

// Demo-only state kept in this browser. The real app gets all of this from the Go API.

export type WalletEntry = { what: string; when: string; amount: number }
export type DemoState = {
  signedIn: boolean
  user: { name: string; email: string; via: string }
  coins: number
  vip: { plan: string; renews: string } | null
  saved: string[]
  liked: string[]
  reminders: string[]
  unlocked: Record<string, number[]>
  progress: Record<string, { ep: number; updated: number }>
  checkin: { streak: number; lastDate: string }
  ads: { date: string; count: number }
  wallet: WalletEntry[]
  settings: { autoplay: boolean; autoUnlock: boolean; cellular: boolean; language: string }
  notify: { episodes: boolean; premieres: boolean; replies: boolean; offers: boolean; checkin: boolean }
  notifyPrompted: boolean
  onboarded: boolean
  genres: string[]
  admin: boolean
}

const KEY = 'the-ending-demo-v1'

export const DEFAULT_STATE: DemoState = {
  signedIn: false,
  user: { name: 'Mya Thandar', email: 'mya@example.com', via: 'Google' },
  coins: 245,
  vip: null,
  saved: ['divorced-ceo', 'alpha-king', 'reborn-empire', 'contract-bride'],
  liked: [],
  reminders: ['duke-maid'],
  unlocked: {},
  progress: {
    'divorced-ceo': { ep: 34, updated: 3 },
    'alpha-king': { ep: 12, updated: 2 },
    'reborn-empire': { ep: 61, updated: 1 },
  },
  checkin: { streak: 3, lastDate: '' },
  ads: { date: '', count: 0 },
  wallet: [
    { what: "Unlocked EP 35 · Divorced, Now I'm the CEO", when: '22/10/2026 · 11:48 PM', amount: -50 },
    { what: 'Watched a short ad', when: '22/10/2026 · 8:30 PM', amount: 20 },
    { what: 'Bought 550 coins', when: '21/10/2026 · 2:41 PM', amount: 550 },
    { what: 'Invited a friend', when: '20/10/2026 · 6:05 PM', amount: 50 },
  ],
  settings: { autoplay: true, autoUnlock: false, cellular: true, language: 'en' },
  notify: { episodes: true, premieres: true, replies: true, offers: false, checkin: true },
  notifyPrompted: false,
  onboarded: false,
  genres: [],
  admin: false,
}

let state: DemoState = DEFAULT_STATE
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) state = { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<DemoState>) }
  } catch {
    state = DEFAULT_STATE
  }
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private mode or blocked storage: the demo still works for this visit.
  }
}

export function update(fn: (s: DemoState) => DemoState) {
  load()
  state = fn(state)
  save()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  load()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDemo(): DemoState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load()
      return state
    },
    () => DEFAULT_STATE,
  )
}

export function getDemo(): DemoState {
  load()
  return state
}

export function resetDemo() {
  update(() => DEFAULT_STATE)
}

// ---- Date helpers (display dd/MM/yyyy, 12-hour clock) ----

export function today(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function nowStamp(): string {
  const d = new Date()
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${today()} · ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`
}

export function addDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ---- Rules ----

export function isUnlocked(s: DemoState, dramaId: string, ep: number): boolean {
  const d = getDrama(dramaId)
  if (!d) return false
  if (ep <= d.freeEpisodes || s.vip) return true
  return (s.unlocked[dramaId] ?? []).includes(ep)
}

export function adsLeft(s: DemoState): number {
  return s.ads.date === today() ? Math.max(0, AD_UNLOCKS_PER_DAY - s.ads.count) : AD_UNLOCKS_PER_DAY
}

export function canCheckIn(s: DemoState): boolean {
  return s.checkin.lastDate !== today()
}

export function nextCheckinAmount(s: DemoState): number {
  return CHECKIN_AMOUNTS[s.checkin.streak % CHECKIN_AMOUNTS.length]
}

// ---- Actions ----

function withUnlock(s: DemoState, dramaId: string, ep: number): DemoState {
  const list = s.unlocked[dramaId] ?? []
  return list.includes(ep) ? s : { ...s, unlocked: { ...s.unlocked, [dramaId]: [...list, ep] } }
}

export function unlockWithCoins(dramaId: string, ep: number): boolean {
  const d = getDrama(dramaId)
  if (!d) return false
  let ok = false
  update((s) => {
    if (s.coins < d.coinsPerEpisode) return s
    ok = true
    const next = withUnlock(s, dramaId, ep)
    return {
      ...next,
      coins: s.coins - d.coinsPerEpisode,
      wallet: [{ what: `Unlocked EP ${ep} · ${d.title}`, when: nowStamp(), amount: -d.coinsPerEpisode }, ...s.wallet],
    }
  })
  return ok
}

export function unlockWithAd(dramaId: string, ep: number) {
  update((s) => {
    const count = s.ads.date === today() ? s.ads.count + 1 : 1
    return { ...withUnlock(s, dramaId, ep), ads: { date: today(), count } }
  })
}

export function addCoins(amount: number, what: string) {
  update((s) => ({ ...s, coins: s.coins + amount, wallet: [{ what, when: nowStamp(), amount }, ...s.wallet] }))
}

export function checkIn(): number {
  let amount = 0
  update((s) => {
    if (!canCheckIn(s)) return s
    amount = nextCheckinAmount(s)
    return {
      ...s,
      coins: s.coins + amount,
      checkin: { streak: s.checkin.streak + 1, lastDate: today() },
      wallet: [{ what: `Daily check-in · day ${(s.checkin.streak % 7) + 1}`, when: nowStamp(), amount }, ...s.wallet],
    }
  })
  return amount
}

export function setProgress(dramaId: string, ep: number) {
  update((s) => ({ ...s, progress: { ...s.progress, [dramaId]: { ep, updated: Date.now() } } }))
}

export function toggleIn(key: 'saved' | 'liked' | 'reminders', id: string) {
  update((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }))
}
