# The Ending · iOS (Swift)

The iPhone and iPad app: SwiftUI (iOS 17+), AVPlayer for episodes. It talks to the same Go API as the web and Android apps ([../Go](../Go)), so accounts, coins, lists and progress are shared.

## Run it

1. Start the server from the repo root: `./start.sh` (or `cd Go && go run .`).
2. Open `TheEnding.xcodeproj` in Xcode 16 or newer and run the `TheEnding` scheme on an iOS Simulator.

The Simulator reaches your Mac at `http://127.0.0.1:8080`, which is the default. On an iPhone, start the server with `ADDR=0.0.0.0:8080`, then set your Mac's Wi-Fi address in the app under Me › Settings › Server. Running on a device needs your own signing team in the target's Signing & Capabilities.

## What's in it

The same viewer screens as the Android app ([docs/DESIGN.md](../docs/DESIGN.md)):

- **Start:** guest account on first launch, sign-in (simulated Google, email code `123456`), genre onboarding, the notification opt-in after sign-in, and an update dialog driven by the admin panel's iOS versions.
- **Tabs:** Home (For You, Rankings, New, Genres), Shorts, Rewards, My List / History and Me, with the subscription status bar attached above the tab bar.
- **Watching:** search, drama page, and a full-screen player. Uploaded episodes stream through AVPlayer with the session cookie; the sample episodes play a timed preview. Sheets cover episodes, unlock with coins or a rewarded ad, top-up, comments with report and delete, share, and playback settings, plus the series-end screen.
- **Money:** coin store, VIP, the simulated checkout (paid, pending or declined), and the wallet with purchases.
- **Account:** inbox, settings, language, notification preferences, help, about, edit profile, sign out, delete account, and a server address setting.

Upload episodes as MP4 (H.264): AVPlayer can't play WebM.

Sign in with Apple appears on iOS only once the project has Apple sign-in configured; this demo hides it.

## Files

| File | Covers |
| --- | --- |
| `Api.swift` | HTTP client; the session cookie lives in the shared cookie store |
| `Models.swift` | API shapes, date and price formats |
| `Store.swift` | State, navigation, actions, the `Loaded` view |
| `TheEndingApp.swift` | App shell, tabs, update dialog, notification opt-in |
| `Discover.swift` | Home tabs, search, Shorts |
| `Watch.swift` | Drama page and player |
| `Money.swift` | Rewards, My List, store, VIP, payment, wallet |
| `Account.swift` | Sign-in, Me, inbox, settings, help, about, profile |
| `UI.swift` | Colors and shared components |
| `UAT.swift` | Debug-only acceptance run: launch with `-uat` |

Before a store release, add real Sign in with Apple and Google, StoreKit purchases, an ad network, push notifications and the Meta SDK with App Tracking Transparency, and remove `NSAllowsArbitraryLoads` from `Info.plist`.
