// Display formats: dates dd/MM/yyyy, times on a 12-hour clock.

const pad = (n: number) => String(n).padStart(2, '0')

export function fmtDate(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function fmtTime(ms: number): string {
  const d = new Date(ms)
  const h = d.getHours()
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'}`
}

export function fmtStamp(ms: number): string {
  return ms ? `${fmtDate(ms)} · ${fmtTime(ms)}` : ''
}

export function price(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function money(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

/** Value for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(v: string): number {
  const t = v ? new Date(v).getTime() : 0
  return Number.isFinite(t) ? t : 0
}
