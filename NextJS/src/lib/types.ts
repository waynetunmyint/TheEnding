// Shapes returned by the Go API (Go/internal/api). Times are JavaScript milliseconds.

export type Drama = {
  id: string
  title: string
  synopsis: string
  genres: string[]
  episodes: number // published episodes
  totalEpisodes: number
  freeEpisodes: number
  coinsPerEpisode: number
  status: 'Published' | 'Scheduled' | 'Draft'
  completed: boolean
  color: string
  color2: string
  badge: '' | 'Hot' | 'New' | 'Exclusive'
  language: string
  releaseAt: number
  poster: string
  banner: string
  updatedAt: number
}

export type Episode = { n: number; title: string; length: number; free: boolean; hasVideo: boolean }

export type Subscription = { state: 'none' | 'pending' | 'active' | 'expired' | 'failed'; plan: string; until: number }

export type Task = { key: string; name: string; amount: number; note: string; done: boolean; claimable: boolean }

export type Settings = { autoplay: boolean; autoUnlock: boolean; cellular: boolean; language: string }

export type NotifyPrefs = { episodes: boolean; premieres: boolean; replies: boolean; offers: boolean; checkin: boolean }

export type Me = {
  user: { id: number; name: string; initial: string; email: string; via: string; color: string; role: string; signedIn: boolean; joined: number }
  coins: number
  subscription: Subscription
  saved: string[]
  liked: string[]
  reminders: string[]
  unlocked: Record<string, number[]>
  progress: Record<string, { ep: number; updated: number }>
  checkin: { streak: number; canCheckIn: boolean; nextAmount: number }
  ads: { left: number; limit: number }
  tasks: Task[]
  settings: Settings
  notify: NotifyPrefs
  notifyPrompted: boolean
  onboarded: boolean
  genres: string[]
  unread: number
  muted: boolean
}

export type CoinPack = { id: string; coins: number; bonus: number; priceCents: number; tag: string; onSale: boolean }
export type VipPlan = { id: string; name: string; priceCents: number; days: number; note: string; tag: string }
export type Versions = { androidMin: string; androidLatest: string; iosMin: string; iosLatest: string }
export type TaskAmounts = { ad: number; watch: number; notify: number; invite: number; signin: number }

export type PublicConfig = {
  coinPacks: CoinPack[]
  vipPlans: VipPlan[]
  checkin: number[]
  adsPerDay: number
  tasks: TaskAmounts
  vipBonus: number
  coinsPerEpisode: number
  supportEmail: string
  maintenance: boolean
  versions: Versions
  genres: string[]
}

export type AppConfig = Omit<PublicConfig, 'genres' | 'supportEmail' | 'maintenance' | 'versions'> & {
  freeEpisodes: number
  welcomeCoins: number
}

export type Payment = {
  order: string
  userId: number
  user: string
  kind: 'Coins' | 'VIP'
  productId: string
  item: string
  amountCents: number
  store: string
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded'
  at: number
  updatedAt: number
}

export type WalletEntry = { what: string; amount: number; at: number }

export type Comment = { id: number; userId: number; name: string; initial: string; color: string; text: string; at: number; mine: boolean }

export type InboxItem = { id: number; kind: string; title: string; body: string; href: string; read: boolean; at: number }

export type Home = { banner: string[]; trending: string[]; soon: string[]; picks: string[]; hot: string[] }

export const RANKING_TABS = ['Hot', 'Rising', 'Most saved', 'Completed'] as const
export type Rankings = Record<(typeof RANKING_TABS)[number], string[]>

// ---- Admin ----

export type AdminMe = { id: number; name: string; email: string; role: string; perms: string[]; badges: { payments: number; comments: number } }

export type AdminUser = {
  id: number; name: string; initial: string; color: string; email: string; via: string; role: string; coins: number
  vipPlan: string; vipUntil: number; mutedUntil: number; joined: number; lastSeen: number; status: string
}

export type AdminDrama = Drama & { uploaded: number; published: number; failed: number }

export type AdminEpisode = { n: number; title: string; length: number; free: boolean; published: boolean; videoStatus: 'None' | 'Ready' | 'Failed'; updatedAt: number }

export type Campaign = {
  id: number; title: string; body: string; audience: string; dramaId: string; dramaTitle: string; targetUser: number
  sendAt: number; status: 'Scheduled' | 'Sent' | 'Canceled'; sentCount: number; createdBy: string
}

export type Slot = { dramaId: string; meta: string }
