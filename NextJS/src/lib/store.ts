'use client'

import { useSyncExternalStore } from 'react'
import { api, ApiError } from '@/lib/api'
import { invalidate } from '@/lib/data'
import type { Episode, Me, NotifyPrefs, Settings } from '@/lib/types'

// The signed-in (or guest) viewer's state, owned by the Go API. Every browser gets a guest
// account on first visit; signing in upgrades it, so nothing done as a guest is lost.

type State = { me: Me | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string }

let state: State = { me: null, status: 'idle', error: '' }
const listeners = new Set<() => void>()
const SERVER: State = { me: null, status: 'idle', error: '' }

function emit(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

export function setMe(me: Me) {
  emit({ me, status: 'ready', error: '' })
}

let booting: Promise<void> | null = null

export function boot(force = false): Promise<void> {
  if (booting && !force) return booting
  emit({ status: state.me ? 'ready' : 'loading' })
  booting = (async () => {
    try {
      setMe(await api<Me>('/me'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        try {
          setMe(await api<Me>('/auth/guest', { method: 'POST' }))
          return
        } catch (e2) {
          emit({ status: 'error', error: (e2 as Error).message })
          return
        }
      }
      emit({ status: 'error', error: (e as Error).message })
    } finally {
      booting = null
    }
  })()
  return booting
}

export function useMe(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      if (state.status === 'idle') void boot()
      return () => { listeners.delete(cb) }
    },
    () => state,
    () => SERVER,
  )
}

export function getMe(): Me | null {
  return state.me
}

async function run(path: string, method = 'POST', body?: unknown): Promise<Me> {
  const me = await api<Me>(path, { method, body })
  setMe(me)
  invalidate('/wallet')
  return me
}

// ---- Rules shared with the API ----

export function vipActive(me: Me | null): boolean {
  return me?.subscription.state === 'active'
}

export function isUnlocked(me: Me | null, dramaId: string, ep: Episode | undefined): boolean {
  if (!ep) return false
  if (ep.free || vipActive(me)) return true
  return (me?.unlocked[dramaId] ?? []).includes(ep.n)
}

// ---- Referral link (?ref=<user id>) ----

const REF_KEY = 'te-ref'

export function rememberReferral() {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && /^\d+$/.test(ref)) window.localStorage.setItem(REF_KEY, ref)
  } catch {
    // Storage blocked: the invite just isn't credited.
  }
}

function referral(): number {
  try {
    return Number(window.localStorage.getItem(REF_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

function clearReferral() {
  try { window.localStorage.removeItem(REF_KEY) } catch { /* ignore */ }
}

// ---- Account ----

export async function signInWithGoogle() {
  const me = await run('/auth/google', 'POST', { ref: referral() })
  clearReferral()
  invalidate('/')
  return me
}

export async function startEmail(email: string) {
  return api<{ challengeId: string; email: string; demoCode: string; expiresIn: number }>('/auth/email/start', { method: 'POST', body: { email } })
}

export async function verifyEmail(challengeId: string, code: string) {
  const me = await run('/auth/email/verify', 'POST', { challengeId, code, ref: referral() })
  clearReferral()
  invalidate('/')
  return me
}

export async function signInAsDemoAdmin() {
  const me = await run('/auth/admin-demo')
  invalidate('/')
  return me
}

export async function signOut() {
  await api('/auth/logout', { method: 'POST' })
  emit({ me: null, status: 'loading' })
  invalidate('/')
  await boot(true)
}

export async function deleteAccount() {
  await api('/me', { method: 'DELETE', body: { confirm: 'DELETE' } })
  emit({ me: null, status: 'loading' })
  invalidate('/')
  await boot(true)
}

export function updateMe(patch: { name?: string; settings?: Settings; notify?: NotifyPrefs; notifyPrompted?: boolean; onboarded?: boolean; genres?: string[] }) {
  // Optimistic: settings toggles feel instant; the server's answer replaces this.
  const me = state.me
  if (me) {
    setMe({
      ...me,
      ...(patch.settings ? { settings: patch.settings } : {}),
      ...(patch.notify ? { notify: patch.notify } : {}),
      ...(patch.notifyPrompted !== undefined ? { notifyPrompted: patch.notifyPrompted } : {}),
      ...(patch.onboarded !== undefined ? { onboarded: patch.onboarded } : {}),
      ...(patch.genres ? { genres: patch.genres } : {}),
      ...(patch.name ? { user: { ...me.user, name: patch.name } } : {}),
    })
  }
  return run('/me', 'PATCH', patch).catch((e) => {
    if (me) setMe(me)
    throw e
  })
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const me = state.me
  if (!me) return Promise.resolve()
  return updateMe({ settings: { ...me.settings, [key]: value } })
}

// ---- Lists ----

export type ListKind = 'saved' | 'liked' | 'reminders'

export function toggleList(kind: ListKind, dramaId: string) {
  const me = state.me
  if (!me) return Promise.resolve()
  const on = me[kind].includes(dramaId)
  setMe({ ...me, [kind]: on ? me[kind].filter((x) => x !== dramaId) : [dramaId, ...me[kind]] })
  return run(`/me/${kind}/${encodeURIComponent(dramaId)}`, on ? 'DELETE' : 'PUT').catch((e) => {
    setMe(me)
    throw e
  })
}

export function clearHistory() {
  return run('/me/history', 'DELETE')
}

export function setProgress(dramaId: string, ep: number) {
  return run('/me/progress', 'POST', { dramaId, ep })
}

export function reportWatch(seconds: number) {
  return api<{ watchSec: number }>('/me/watch', { method: 'POST', body: { seconds } })
}

// ---- Coins ----

export function unlockWithCoins(dramaId: string, ep: number) {
  return run('/unlock', 'POST', { dramaId, ep })
}

export function startAd(purpose: 'unlock' | 'reward', dramaId = '', ep = 0) {
  return api<{ ticket: string; seconds: number }>('/ads/start', { method: 'POST', body: { purpose, dramaId, ep } })
}

export function completeAd(ticket: string) {
  return run('/ads/complete', 'POST', { ticket })
}

export async function checkIn() {
  const out = await api<{ amount: number; vipBonus: number; me: Me }>('/checkin', { method: 'POST' })
  setMe(out.me)
  invalidate('/wallet')
  return out
}

export function claimTask(key: string) {
  return run(`/tasks/${key}/claim`)
}

export function cancelVip() {
  return run('/me/vip/cancel')
}
