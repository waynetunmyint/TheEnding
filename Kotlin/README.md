# The Ending · Android (Kotlin)

The Android app: Kotlin, Jetpack Compose, Media3 ExoPlayer and Coil. It talks to the same Go API as the web app ([../Go](../Go)), so accounts, coins, lists and progress are shared.

## Run it

1. Start the server from the repo root: `./start.sh` (or `cd Go && go run .`).
2. Open this folder in Android Studio and run the `app` configuration on an emulator, or from the command line:

```bash
./gradlew :app:installDebug
```

The emulator reaches your computer at `http://10.0.2.2:8080`, which is the default. On a real phone, start the server with `ADDR=0.0.0.0:8080`, then set your computer's Wi-Fi address in the app under Me › Settings › Server. You can also bake in another address at build time with `./gradlew :app:assembleDebug -PtheEndingApiUrl=http://192.168.1.10:8080`.

## What's in it

Every viewer screen from the design ([docs/DESIGN.md](../docs/DESIGN.md)):

- **Start:** guest account on first launch, sign-in (simulated Google, email code `123456`), genre onboarding, the notification opt-in after sign-in, and an update dialog driven by the admin panel's Android versions.
- **Tabs:** Home (For You with rotating banner, Rankings, New with reminders, Genres), Shorts, Rewards, My List / History and Me, with the subscription status bar pinned above the tab bar.
- **Watching:** search, drama page, and a full-screen player. Uploaded episodes stream through ExoPlayer with the session cookie; the sample episodes play a timed preview. Sheets cover episodes, unlock with coins or a rewarded ad, top-up, comments with report and delete, share, and playback settings, plus the series-end screen.
- **Money:** coin store, VIP, the simulated checkout (paid, pending or declined), and the wallet with purchases.
- **Account:** inbox, settings, language, notification preferences, help, about, edit profile, sign out, delete account, and a server address setting.

The admin panel is web-only, at `/admin` on the server.

## Files

| File | Covers |
| --- | --- |
| `Api.kt` | HTTP client, session cookie |
| `Models.kt` | API shapes |
| `AppStore.kt` | State, navigation, actions, `rememberLoad` |
| `MainActivity.kt` | App shell, tabs, update dialog, notification opt-in |
| `Discover.kt` | Home tabs, search, Shorts |
| `Watch.kt` | Drama page and player |
| `Money.kt` | Rewards, My List, store, VIP, payment, wallet |
| `Account.kt` | Sign-in, Me, inbox, settings, help, about, profile |
| `ui/Components.kt` | Theme and shared components |

Before a store release, add the real sign-in, Google Play Billing, an ad network, push notifications and the Meta install SDK, and turn off cleartext HTTP (`res/xml/network_security_config.xml`).
