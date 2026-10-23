// Thin client for the Go API. The session lives in an HttpOnly cookie set by the API.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const OFFLINE = "Can't reach The Ending. Check your connection and try again."

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      cache: 'no-store',
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, OFFLINE)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? `Something went wrong (${res.status})`)
  return data as T
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Try again.'
}

// Multipart upload with progress (fetch can't report upload progress).
export function upload<T>(path: string, file: File, fields: Record<string, string>, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api${path}`)
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      let data: unknown = null
      try { data = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T)
      else reject(new ApiError(xhr.status, (data as { error?: string } | null)?.error ?? `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new ApiError(0, OFFLINE))
    const form = new FormData()
    Object.entries(fields).forEach(([k, v]) => form.append(k, v))
    form.append('file', file)
    xhr.send(form)
  })
}
