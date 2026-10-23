// Sample data for the demo build. Every value here is made up; the real app reads from the Go API.

export type Drama = {
  id: string
  title: string
  genres: string[]
  synopsis: string
  episodes: number
  freeEpisodes: number
  coinsPerEpisode: number
  status: 'Published' | 'Scheduled' | 'Draft'
  completed: boolean
  color: string
  color2: string
  badge?: 'Hot' | 'New' | 'Exclusive'
  releaseDate: string
}

export const DRAMAS: Drama[] = [
  { id: 'contract-bride', title: "The Billionaire's Contract Bride", genres: ['Romance', 'CEO', 'Contract marriage'], synopsis: "To pay her father's hospital bills, Lin Xia signs a one-year marriage contract with the coldest CEO in the city. No feelings, no questions. Then his ex-fiancée comes back, and the contract starts to burn.", episodes: 80, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#5B2333', color2: '#7A3546', badge: 'Hot', releaseDate: '18/10/2026' },
  { id: 'reborn-empire', title: 'Reborn to Rule the Empire', genres: ['Rebirth', 'Revenge', 'Historical'], synopsis: 'Poisoned by the sister she trusted, the empress wakes up ten years earlier with every memory intact. This time she will choose the throne, and the man beside it.', episodes: 72, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#3B2A5E', color2: '#52407E', badge: 'Exclusive', releaseDate: '12/10/2026' },
  { id: 'hidden-heir', title: 'My Bodyguard Is a Hidden Heir', genres: ['Hidden identity', 'Romance'], synopsis: 'She hired the quietest bodyguard in Yangon. She did not know he owns the company that is trying to buy hers.', episodes: 60, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#1F3A5B', color2: '#2F5480', badge: 'New', releaseDate: '22/10/2026' },
  { id: 'divorced-ceo', title: "Divorced, Now I'm the CEO", genres: ['Revenge', 'Urban'], synopsis: 'Thrown out after three years of marriage, she returns as the head of the company that owns his.', episodes: 90, freeEpisodes: 8, coinsPerEpisode: 50, status: 'Published', completed: false, color: '#5E3A1F', color2: '#80532F', badge: 'Hot', releaseDate: '01/10/2026' },
  { id: 'alpha-king', title: "The Alpha King's Lost Mate", genres: ['Werewolf', 'Second chance'], synopsis: 'Rejected on her wedding night, she runs. Five years later the Alpha King finds her, and the son he never knew about.', episodes: 68, freeEpisodes: 12, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#2C4A3A', color2: '#3E6651', releaseDate: '17/10/2026' },
  { id: 'true-daughter', title: 'Revenge of the True Daughter', genres: ['Family', 'Revenge'], synopsis: 'Switched at birth and raised in a village, the real heiress comes home. The fake daughter has had twenty years to prepare.', episodes: 75, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#4A1F3D', color2: '#683058', badge: 'New', releaseDate: '21/10/2026' },
  { id: 'night-market', title: 'Hidden Master of the Night Market', genres: ['Martial arts', 'Hidden identity'], synopsis: 'He sells noodles by night. The city’s gangs are about to learn who taught their bosses to fight.', episodes: 64, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#26324F', color2: '#38486F', releaseDate: '18/10/2026' },
  { id: 'rival-contract', title: 'Love Contract With My Rival', genres: ['Sweet love', 'Romance'], synopsis: 'Two rival chefs fake a relationship for a TV contest. The cameras are not the only ones fooled.', episodes: 58, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#5A2A2A', color2: '#7A3D3D', releaseDate: '20/10/2026' },
  { id: 'runaway-bride', title: "The Emperor's Runaway Bride", genres: ['Historical', 'Romance'], synopsis: 'She escaped the palace on her wedding day. He became emperor the same night, and he never stopped looking.', episodes: 82, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Published', completed: true, color: '#4D3B1E', color2: '#6E552D', releaseDate: '19/10/2026' },
  { id: 'duke-maid', title: 'The Duke Who Married a Maid', genres: ['Romance', 'Historical'], synopsis: 'A duke needs a wife by midnight. The maid who spilled wine on him will do.', episodes: 66, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Scheduled', completed: true, color: '#3A2A4E', color2: '#52406E', releaseDate: '25/10/2026' },
  { id: 'ex-husband', title: 'My Ex-Husband Begs Again', genres: ['Revenge'], synopsis: 'He chose his first love over her. Now she is engaged to his boss.', episodes: 70, freeEpisodes: 10, coinsPerEpisode: 60, status: 'Draft', completed: false, color: '#4E2A2A', color2: '#6E3D3D', releaseDate: '28/10/2026' },
]

export const PUBLISHED = DRAMAS.filter((d) => d.status === 'Published')
export const COMING_SOON = DRAMAS.filter((d) => d.status !== 'Published')
export const GENRES = ['Romance', 'CEO', 'Revenge', 'Rebirth', 'Werewolf', 'Family', 'Historical', 'Hidden identity', 'Sweet love', 'Martial arts', 'Urban']

export function getDrama(id: string): Drama | undefined {
  return DRAMAS.find((d) => d.id === id)
}

const EPISODE_TITLES = [
  'The contract', 'A cold welcome', 'Rules of the house', 'The ex-fiancée returns', 'The first lie', 'A dinner gone wrong',
  'Behind closed doors', 'The hospital bill', 'Jealousy', 'One kiss changes everything', 'The secret letter', 'Caught',
  'A deal with the devil', 'The board meeting', 'Breaking point', 'The truth comes out',
]

export function episodeTitle(n: number): string {
  return EPISODE_TITLES[(n - 1) % EPISODE_TITLES.length]
}

// Episode length in seconds, stable per episode.
export function episodeLength(n: number): number {
  return 75 + ((n * 37) % 50)
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const RANKING_TABS = ['Hot', 'Rising', 'Most saved', 'Completed'] as const

export const RANKINGS: Record<(typeof RANKING_TABS)[number], string[]> = {
  Hot: ['contract-bride', 'reborn-empire', 'hidden-heir', 'divorced-ceo', 'alpha-king', 'true-daughter', 'night-market', 'rival-contract'],
  Rising: ['true-daughter', 'hidden-heir', 'rival-contract', 'contract-bride', 'runaway-bride', 'alpha-king'],
  'Most saved': ['reborn-empire', 'contract-bride', 'alpha-king', 'divorced-ceo', 'night-market', 'runaway-bride'],
  Completed: ['contract-bride', 'reborn-empire', 'alpha-king', 'hidden-heir', 'runaway-bride', 'rival-contract'],
}

export const COIN_PACKS = [
  { id: 'coins_100', coins: 100, bonus: 100, price: '$0.99', tag: 'First top-up x2' },
  { id: 'coins_500', coins: 500, bonus: 50, price: '$4.99', tag: 'Popular' },
  { id: 'coins_1000', coins: 1000, bonus: 150, price: '$9.99', tag: '' },
  { id: 'coins_2000', coins: 2000, bonus: 400, price: '$19.99', tag: '' },
  { id: 'coins_5000', coins: 5000, bonus: 1500, price: '$49.99', tag: 'Best value' },
  { id: 'coins_10000', coins: 10000, bonus: 4000, price: '$99.99', tag: '' },
]

export const VIP_PLANS = [
  { id: 'vip_weekly', name: 'Weekly', price: '$4.99', note: 'Renews every 7 days', days: 7, tag: '' },
  { id: 'vip_monthly', name: 'Monthly', price: '$14.99', note: 'Renews every month', days: 30, tag: 'Most popular' },
  { id: 'vip_yearly', name: 'Yearly', price: '$99.99', note: '$8.33 a month · save 44%', days: 365, tag: 'Best value' },
]

export const CHECKIN_AMOUNTS = [10, 10, 15, 15, 20, 20, 50]
export const AD_UNLOCKS_PER_DAY = 3

export const COMMENTS = [
  { initial: 'M', color: '#7A3546', name: 'Mya', text: 'He finally noticed her! I screamed at 0:58', date: '22/10/2026' },
  { initial: 'Z', color: '#2F5480', name: 'Ko Zaw', text: 'The ex-fiancée is going to regret this so much.', date: '22/10/2026' },
  { initial: 'L', color: '#3E6651', name: 'Lin', text: 'Who else unlocked all 80 in one night?', date: '21/10/2026' },
  { initial: 'S', color: '#52407E', name: 'Su Su', text: 'The contract scene in EP 1 hits different now.', date: '21/10/2026' },
  { initial: 'A', color: '#80532F', name: 'Aung', text: 'Need season 2 please', date: '20/10/2026' },
]

export const TRENDING_SEARCHES = ['Contract bride', 'Hidden heir', 'Rebirth revenge', 'Alpha king', 'Divorced CEO', 'True daughter', 'Runaway bride', 'Night market', 'Sweet love', 'Bodyguard']

export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'my', name: 'မြန်မာ', english: 'Burmese' },
  { code: 'th', name: 'ไทย', english: 'Thai' },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'zh', name: '中文', english: 'Chinese' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'pt', name: 'Português', english: 'Portuguese' },
]

export const FAQS = [
  ['How do coins work?', 'Most episodes cost 60 coins to unlock, forever. Earn free coins from check-ins, tasks and short ads, or buy them in the Coin Store.'],
  ["I paid but didn't get coins", 'Open Wallet. If the payment shows as pending, coins arrive when your store confirms it. Still missing after an hour? Send us the order number below.'],
  ['How do I cancel VIP?', 'VIP renews through Google Play or the App Store. Cancel there any time; you keep VIP until the end of the paid period.'],
  ["A video won't play", 'Try a lower quality in the player menu, check your connection, then restart the app.'],
  ['Can I watch on the web?', 'Yes. Sign in with the same Google or email account and your list, coins and VIP follow you.'],
] as const

// ---- Admin sample data ----

export const ADMIN_USERS = [
  { id: '10293847', initial: 'M', color: '#7A3546', name: 'Mya Thandar', email: 'mya@example.com', via: 'Google', coins: 245, vip: '23/11/2026', joined: '02/10/2026', status: 'Active' },
  { id: '10293112', initial: 'Z', color: '#2F5480', name: 'Ko Zaw', email: 'zaw@example.com', via: 'Email code', coins: 1020, vip: '', joined: '28/09/2026', status: 'Active' },
  { id: '10292004', initial: 'L', color: '#3E6651', name: 'Lin', email: 'lin@example.com', via: 'Apple', coins: 60, vip: '01/11/2026', joined: '15/09/2026', status: 'Active' },
  { id: '10291876', initial: 'S', color: '#52407E', name: 'Su Su', email: 'susu@example.com', via: 'Google', coins: 0, vip: '', joined: '11/09/2026', status: 'Active' },
  { id: '10290455', initial: 'A', color: '#80532F', name: 'Aung', email: 'aung@example.com', via: 'Google', coins: 3400, vip: '10/09/2027', joined: '30/08/2026', status: 'Active' },
  { id: '10289930', initial: 'K', color: '#683058', name: 'Kyaw Kyaw', email: 'kyaw@example.com', via: 'Email code', coins: 15, vip: '', joined: '22/08/2026', status: 'Banned' },
  { id: '10289210', initial: 'N', color: '#38486F', name: 'Nandar', email: 'nandar@example.com', via: 'Google', coins: 410, vip: '', joined: '19/08/2026', status: 'Active' },
  { id: '10288001', initial: 'T', color: '#6E552D', name: 'Thu Zar', email: 'thuzar@example.com', via: 'Apple', coins: 90, vip: '30/10/2026', joined: '01/08/2026', status: 'Active' },
]

export const ADMIN_PAYMENTS = [
  { when: '23/10/2026 · 2:41 PM', userId: '10293847', user: 'Mya Thandar', item: '550 coins', store: 'Google Play', amount: '$4.99', status: 'Paid', order: 'GPA.3312-7781', kind: 'Coins' },
  { when: '23/10/2026 · 1:05 PM', userId: '10293112', user: 'Ko Zaw', item: 'VIP Monthly', store: 'App Store', amount: '$14.99', status: 'Pending', order: '2000000741', kind: 'VIP' },
  { when: '23/10/2026 · 12:47 PM', userId: '10289210', user: 'Nandar', item: '1,150 coins', store: 'Google Play', amount: '$9.99', status: 'Pending', order: 'GPA.3390-1182', kind: 'Coins' },
  { when: '23/10/2026 · 11:30 AM', userId: '10290455', user: 'Aung', item: 'VIP Yearly', store: 'Google Play', amount: '$99.99', status: 'Paid', order: 'GPA.3301-0049', kind: 'VIP' },
  { when: '22/10/2026 · 10:12 PM', userId: '10291876', user: 'Su Su', item: '200 coins', store: 'App Store', amount: '$0.99', status: 'Failed', order: '2000000735', kind: 'Coins' },
  { when: '22/10/2026 · 9:58 PM', userId: '10292004', user: 'Lin', item: 'VIP Weekly', store: 'App Store', amount: '$4.99', status: 'Paid', order: '2000000733', kind: 'VIP' },
  { when: '22/10/2026 · 6:20 PM', userId: '10288001', user: 'Thu Zar', item: '2,400 coins', store: 'Google Play', amount: '$19.99', status: 'Refunded', order: 'GPA.3288-4410', kind: 'Coins' },
  { when: '22/10/2026 · 3:02 PM', userId: '10289930', user: 'Kyaw Kyaw', item: '550 coins', store: 'Google Play', amount: '$4.99', status: 'Paid', order: 'GPA.3285-9921', kind: 'Coins' },
] as const

export const REPORTED_COMMENTS = [
  { id: 'c1', initial: 'K', color: '#683058', userId: '10289930', name: 'Kyaw Kyaw', where: 'Reborn to Rule · EP 12', when: '23/10/2026 · 10:02 AM', reports: '4 reports · spam', text: 'Free coins here!!! visit my page for unlimited VIP' },
  { id: 'c2', initial: 'R', color: '#38486F', userId: '10289210', name: 'Ray', where: "Divorced, Now I'm the CEO · EP 33", when: '22/10/2026 · 11:51 PM', reports: '3 reports · spoiler', text: 'Lol she becomes the CEO in EP 60 and he loses everything' },
  { id: 'c3', initial: 'P', color: '#80532F', userId: '10290455', name: 'Phyo', where: "The Billionaire's Contract Bride · EP 4", when: '22/10/2026 · 8:14 PM', reports: '2 reports · harassment', text: '[Comment text held for review]' },
]

export const REVENUE_14D = [420, 510, 480, 620, 700, 655, 810, 760, 690, 880, 940, 905, 1010, 1080]

export const AUDIT_LOG = [
  { when: '23/10/2026 · 2:58 PM', who: 'Support agent', what: 'Added 100 coins to Mya Thandar · Refund for playback problem' },
  { when: '23/10/2026 · 1:20 PM', who: 'Content editor', what: "Published EP 36 of Divorced, Now I'm the CEO" },
  { when: '23/10/2026 · 10:05 AM', who: 'Moderator', what: 'Hid a comment by Kyaw Kyaw · spam' },
  { when: '22/10/2026 · 6:40 PM', who: 'Wayne Tun Myint', what: 'Changed coins per episode 50 → 60' },
]
