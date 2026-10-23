# The Ending — design inventory

Every screen and state of the app, used as the design, build and UAT checklist.
The web version uses the same design, laid out responsively (sidebar instead of bottom tabs on desktop).

- Claude Design canvas (private to the owner): https://claude.ai/artifact/CmBkGN1cwCFK7XCVbX2AQ9
- Canvas source in this repo: [design/canvas/](../design/canvas/)

## Look

- Ground: plum-black `#0F0C11`; surfaces `#1B1720`, `#262029`.
- Primary button: `#E0245E` (white text); accent text `#FF5C7A`; VIP gold `#F2C46D`.
- Type: Inter. Flat, borderless, list-first; outlines only on input fields.
- Logo: [design/logo/](../design/logo/).

## Screens

Status: ✅ designed · ⏳ to do

### 1. Launch & sign-in
| Artboard | Screen | Status |
| --- | --- | --- |
| Main | Splash | ✅ |
| Onboarding | Pick favourite genres | ✅ |
| Login | Google first, Apple (iOS only), email | ✅ |
| LoginEmail | Enter email | ✅ |
| LoginOtp | 6-digit code | ✅ |
| LoginOtpError | Wrong or expired code | ✅ |
| LoginEmbedded | In-app browser: Google disabled, open in browser | ✅ |
| NotifyOptIn | Post-login notification opt-in | ✅ |
| UpdateDialog | Update available (optional / required) | ✅ |

### 2. Home & discovery
| Artboard | Screen | Status |
| --- | --- | --- |
| Home | For You: banner, continue watching, trending, picks | ✅ |
| HomeRanking | Rankings: hot, rising, most saved, completed | ✅ |
| HomeNew | New releases and coming soon (remind me) | ⏳ |
| Category | Browse by genre | ⏳ |
| HomeLoading | Loading skeleton | ⏳ |
| HomeOffline | Offline / error with retry | ⏳ |
| Search | Recent and trending searches | ⏳ |
| SearchResults | Results | ⏳ |
| SearchEmpty | No results | ⏳ |

### 3. Watch
| Artboard | Screen | Status |
| --- | --- | --- |
| Shorts | Swipe feed of trailers | ⏳ |
| Detail | Drama detail | ⏳ |
| Player | Full-screen episode player | ⏳ |
| PlayerPaused | Paused, speed and quality | ⏳ |
| Episodes | Episode list sheet | ⏳ |
| Unlock | Locked episode: coins, ad, VIP | ⏳ |
| TopUpSheet | Not enough coins | ⏳ |
| AdReward | Ad watched, episode unlocked | ⏳ |
| Comments | Comments sheet | ⏳ |
| Share | Share sheet | ⏳ |
| PlayerError | Buffering / playback error | ⏳ |
| SeriesEnd | Series finished, what's next | ⏳ |

### 4. My List, rewards, coins & VIP
| Artboard | Screen | Status |
| --- | --- | --- |
| MyList | Saved dramas | ⏳ |
| History | Watch history | ⏳ |
| MyListEmpty | Empty list | ⏳ |
| Rewards | Daily check-in and tasks | ⏳ |
| CheckIn | Check-in reward dialog | ⏳ |
| Store | Coin store | ⏳ |
| Vip | VIP membership | ⏳ |
| PaySuccess | Payment success | ⏳ |
| PayPending | Payment pending | ⏳ |
| PayFailed | Payment failed | ⏳ |
| Wallet | Coin balance and records | ⏳ |

### 5. Me & settings
| Artboard | Screen | Status |
| --- | --- | --- |
| Me | Profile, signed in | ⏳ |
| MeGuest | Profile, guest | ⏳ |
| EditProfile | Edit profile | ⏳ |
| Inbox | Notifications inbox | ⏳ |
| Settings | Settings | ⏳ |
| Language | Language | ⏳ |
| NotifySettings | Notification settings | ⏳ |
| Help | Help & feedback | ⏳ |
| About | About & legal | ⏳ |
| Logout | Sign-out confirm | ⏳ |
| DeleteAccount | Delete account | ⏳ |

### 6. Shared components
| Artboard | Screen | Status |
| --- | --- | --- |
| BottomBar | Subscription status bar on top of the tab bar | ✅ |
| SubStates | Subscription bar, every state | ⏳ |
