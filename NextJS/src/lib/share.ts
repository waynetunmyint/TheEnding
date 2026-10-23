import type { Drama } from '@/lib/types'
import { getMe } from '@/lib/store'

/** Link to a drama; signed-in viewers' links carry their invite code. */
export function dramaLink(d: Drama): string {
  const me = getMe()
  const ref = me?.user.signedIn ? `?ref=${me.user.id}` : ''
  return `${window.location.origin}/drama/${d.id}/${ref}`
}

export async function shareDrama(d: Drama, show: (m: string) => void) {
  const url = dramaLink(d)
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

export async function shareInvite(show: (m: string) => void) {
  const me = getMe()
  if (!me?.user.signedIn) return
  const url = `${window.location.origin}/?ref=${me.user.id}`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'The Ending', text: 'Join me on The Ending. We both get free coins.', url })
      return
    }
    await navigator.clipboard.writeText(url)
    show('Invite link copied')
  } catch {
    // Dismissed.
  }
}
