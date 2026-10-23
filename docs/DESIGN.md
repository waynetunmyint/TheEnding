# The Ending — design inventory

Every screen and state of the app and the admin panel, used as the design, build and UAT checklist.
The web version uses the same design, laid out responsively (sidebar instead of bottom tabs on desktop).
The admin panel lives in the same Next.js app under `/admin`.

- Claude Design canvas: https://claude.ai/artifact/CmBkGN1cwCFK7XCVbX2AQ9
- Canvas source in this repo: [design/canvas/](../design/canvas/)

## Look

- Ground: plum-black `#0F0C11`; surfaces `#1B1720`, `#262029`.
- Primary button: `#E0245E` (white text); accent text `#FF5C7A`; VIP gold `#F2C46D`.
- Type: Inter. Flat, borderless, list-first; outlines only on input fields.
- Logo: [design/logo/](../design/logo/).

## Screens

Status: ✅ designed (54 app artboards + 16 admin artboards, 23/10/2026)

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
| HomeNew | New releases and coming soon (remind me) | ✅ |
| Category | Browse by genre | ✅ |
| HomeLoading | Loading skeleton | ✅ |
| HomeOffline | Offline / error with retry | ✅ |
| Search | Recent and trending searches | ✅ |
| SearchResults | Results | ✅ |
| SearchEmpty | No results | ✅ |

### 3. Watch
| Artboard | Screen | Status |
| --- | --- | --- |
| Shorts | Swipe feed of trailers | ✅ |
| Detail | Drama detail | ✅ |
| Player | Full-screen episode player | ✅ |
| PlayerPaused | Paused, speed and quality | ✅ |
| Episodes | Episode list sheet | ✅ |
| Unlock | Locked episode: coins, ad, VIP | ✅ |
| TopUpSheet | Not enough coins | ✅ |
| AdReward | Ad watched, episode unlocked | ✅ |
| Comments | Comments sheet | ✅ |
| Share | Share sheet | ✅ |
| PlayerError | Buffering / playback error | ✅ |
| SeriesEnd | Series finished, what's next | ✅ |

### 4. My List, rewards, coins & VIP
| Artboard | Screen | Status |
| --- | --- | --- |
| MyList | Saved dramas | ✅ |
| History | Watch history | ✅ |
| MyListEmpty | Empty list | ✅ |
| Rewards | Daily check-in and tasks | ✅ |
| CheckIn | Check-in reward dialog | ✅ |
| Store | Coin store | ✅ |
| Vip | VIP membership | ✅ |
| PaySuccess | Payment success | ✅ |
| PayPending | Payment pending | ✅ |
| PayFailed | Payment failed | ✅ |
| Wallet | Coin balance and records | ✅ |

### 5. Me & settings
| Artboard | Screen | Status |
| --- | --- | --- |
| Me | Profile, signed in | ✅ |
| MeGuest | Profile, guest | ✅ |
| EditProfile | Edit profile | ✅ |
| Inbox | Notifications inbox | ✅ |
| Settings | Settings | ✅ |
| Language | Language | ✅ |
| NotifySettings | Notification settings | ✅ |
| Help | Help & feedback | ✅ |
| About | About & legal | ✅ |
| Logout | Sign-out confirm | ✅ |
| DeleteAccount | Delete account | ✅ |

### 6. Shared components
| Artboard | Screen | Status |
| --- | --- | --- |
| BottomBar | Subscription status bar on top of the tab bar | ✅ |
| SubStates | Subscription bar, every state | ✅ |

### 7. Admin panel (Next.js `/admin`)
Desktop-first, responsive (the sidebar stacks above the content on a phone). Same palette as the app.
Every `/admin` request is authorised by GoBackend admin roles; the Next.js route guard is only for UX.

| Artboard | Route | Screen | Status |
| --- | --- | --- | --- |
| AdminLogin | `/admin/login` | Admin sign-in (Google, email code) | ✅ |
| AdminForbidden | `/admin/*` (403) | Signed in but not an admin | ✅ |
| AdminDashboard | `/admin` | Revenue, users, VIP, unlocks; needs-attention list; top dramas | ✅ |
| AdminDramas | `/admin/dramas` | Drama list with search and status filter (Tweaks: loading, error) | ✅ |
| AdminDramasEmpty | `/admin/dramas` | No dramas yet | ✅ |
| AdminDramaEdit | `/admin/dramas/new`, `/admin/dramas/[id]` | Details, poster, banner, pricing, release, publish | ✅ |
| AdminEpisodes | `/admin/dramas/[id]/episodes` | Bulk video upload queue, episode table, free/locked, publish | ✅ |
| AdminHome | `/admin/home` | Banner, pinned trending, coming soon | ✅ |
| AdminUsers | `/admin/users` | User search and filters | ✅ |
| AdminUserDetail | `/admin/users/[id]` | Profile, coin activity, coin adjustment with reason, VIP, ban | ✅ |
| AdminPayments | `/admin/payments` | Coin and VIP purchases, pending recheck, CSV export | ✅ |
| AdminComments | `/admin/comments` | Reported queue: keep, hide, mute | ✅ |
| AdminRewards | `/admin/monetization` | Episode defaults, coin packs, VIP plans, check-in and tasks | ✅ |
| AdminPush | `/admin/notifications` | Compose, audience, schedule, preview, history | ✅ |
| AdminSettings | `/admin/settings` | App min/latest versions, maintenance, admins and roles, audit log | ✅ |
| AdminNav | — | Shared sidebar component | ✅ |

Roles: Owner (everything), Editor (dramas, episodes, Home), Support (users, payments, coin adjustments), Moderator (comments). Every admin write goes to the audit log.

## Notes for build

- Some artboards switch state from their Tweaks panel: OTP (entering / error), Update (optional / required), Offline (offline / server error), Ad reward (unlocked / ad failed), Player error (error / buffering), Payment (success / pending / failed), Inbox (empty), Notification settings (phone permission blocked), Unlock (coin balance), Login and Edit profile (iOS shows Apple).
- Tab screens import `BottomBar`; its `sub` prop is the backend subscription state. Loading and offline screens hide the subscription bar.
- Prices ($0.99–$99.99 coin packs; $4.99 / $14.99 / $99.99 VIP), episode cost (60 coins), check-in amounts and drama titles are sample values. Set the real ones before launch.
- Posters and video frames are colour placeholders until real artwork exists. Posters, banners and episode videos uploaded in the admin panel replace them.

## Build status

The web app and admin panel are built on the Go + SQLite API for every route above (see the root README). Simulated in this build: email codes, Google sign-in, store checkout, rewarded ads and push delivery (notifications go to the in-app inbox). The Android (Kotlin) and iOS (Swift) apps cover every viewer screen above, including the Update dialog. Still to do for a store release: real sign-in (Google, Apple), Play Billing and StoreKit, an ad network, push, and the Meta SDK.
