'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { api, ApiError } from '@/lib/api'
import type { Drama, PublicConfig } from '@/lib/types'

// A small stale-while-revalidate cache for GET requests, shared by every component that asks
// for the same path.

type Entry = { data?: unknown; error?: ApiError; loading: boolean; at: number }
const EMPTY: Entry = { loading: false, at: 0 }
const cache = new Map<string, Entry>()
const subs = new Map<string, Set<() => void>>()
const FRESH_MS = 15_000

function set(key: string, patch: Partial<Entry>) {
  cache.set(key, { ...(cache.get(key) ?? EMPTY), ...patch })
  subs.get(key)?.forEach((f) => f())
}

export async function revalidate(path: string, force = false) {
  const e = cache.get(path)
  if (e?.loading) return
  if (!force && e && e.data !== undefined && Date.now() - e.at < FRESH_MS) return
  set(path, { loading: true })
  try {
    const data = await api<unknown>(path)
    set(path, { data, error: undefined, loading: false, at: Date.now() })
  } catch (err) {
    set(path, { error: err instanceof ApiError ? err : new ApiError(0, String(err)), loading: false, at: Date.now() })
  }
}

/** Replace cached data (after a write that returned the new value). */
export function setData<T>(path: string, data: T) {
  set(path, { data, error: undefined, at: Date.now() })
}

/** Refetch every cached path that starts with prefix and is on screen; drop the rest. */
export function invalidate(prefix: string) {
  for (const key of [...cache.keys()]) {
    if (!key.startsWith(prefix)) continue
    if (subs.get(key)?.size) void revalidate(key, true)
    else cache.delete(key)
  }
}

export function useApi<T>(path: string | null) {
  const key = path ?? ''
  const entry = useSyncExternalStore(
    (cb) => {
      if (!subs.has(key)) subs.set(key, new Set())
      subs.get(key)!.add(cb)
      return () => { subs.get(key)?.delete(cb) }
    },
    () => (path ? cache.get(key) ?? EMPTY : EMPTY),
    () => EMPTY,
  )
  useEffect(() => { if (path) void revalidate(path) }, [path])
  return {
    data: entry.data as T | undefined,
    error: entry.data === undefined ? entry.error : undefined,
    loading: !!path && entry.data === undefined && !entry.error,
    reload: () => (path ? revalidate(path, true) : Promise.resolve()),
  }
}

export function useConfig() {
  return useApi<PublicConfig>('/config')
}

/** Every drama a viewer can see (published and announced), with lookups. */
export function useCatalog() {
  const q = useApi<Drama[]>('/dramas')
  return useMemo(() => {
    const list = q.data ?? []
    const byId = new Map(list.map((d) => [d.id, d]))
    return {
      ...q,
      ready: q.data !== undefined,
      list,
      get: (id: string) => byId.get(id),
      pick: (ids: string[]) => ids.map((id) => byId.get(id)).filter((d): d is Drama => Boolean(d)),
      published: list.filter((d) => d.status === 'Published'),
    }
  }, [q])
}
