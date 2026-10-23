// Static copy that doesn't come from the API.

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
  ["I paid but didn't get coins", 'Open Wallet. If the payment shows as pending, coins arrive when your store confirms it. Still missing? Send us the order number below.'],
  ['How do I cancel VIP?', 'VIP renews through Google Play or the App Store. Cancel there any time; you keep VIP until the end of the paid period.'],
  ["A video won't play", 'Try a lower quality in the player menu, check your connection, then reload the page.'],
  ['Can I watch on the web?', 'Yes. Sign in with the same Google or email account and your list, coins and VIP follow you.'],
] as const

export const HELP_TOPICS = ['Payment or coins', 'Playback problem', 'Account and sign-in', 'Something else'] as const

export const REPORT_REASONS = [['spam', 'Spam'], ['spoiler', 'Spoiler'], ['harassment', 'Harassment'], ['other', 'Something else']] as const

// sessionStorage key for the pending email sign-in (challenge id, email, demo code).
export const CHALLENGE_KEY = 'te-login-challenge'
