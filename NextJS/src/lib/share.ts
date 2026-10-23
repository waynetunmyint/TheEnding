import type { Drama } from '@/data/dummy'

export async function shareDrama(d: Drama, show: (m: string) => void) {
  const url = `${window.location.origin}/drama/${d.id}/`
  try {
    if (navigator.share) {
      await navigator.share({ title: d.title, text: `Watch ${d.title} on The Ending`, url })
      return
    }
    await navigator.clipboard.writeText(url)
    show('Link copied')
  } catch {
    // Share sheet dismissed or clipboard blocked: nothing to do.
  }
}
