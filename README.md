# The Ending

A vertical short-drama app: 1–3 minute episodes, swiped full screen, in the style of the leading Chinese short-drama apps.

![The Ending](design/logo/the-ending-icon.png)

This repository is a complete, working app you can run on your own computer: a Go API with a SQLite database, a Next.js viewer app and admin panel, and native Android (Kotlin) and iOS (Swift) apps on the same API. Sign-in, payments and ads are simulated, so it runs with no accounts, keys or cloud services.

## Run it

You need [Go 1.26+](https://go.dev/dl/) and [Node.js 22+](https://nodejs.org/).

```bash
./start.sh
```

Then open http://127.0.0.1:8080. For the phone apps, see [Kotlin/README.md](Kotlin/README.md) and [Swift/README.md](Swift/README.md). The first run builds the web app and creates `Go/data/the-ending.db` with sample dramas, viewers, payments and comments. Run `REBUILD=1 ./start.sh` after changing the web app.

- **Viewer:** you start as a guest with 100 welcome coins. Sign in with any email and the code `123456`; your coins, list and progress move to that account.
- **Admin panel:** open Me › Admin panel (or `/admin/login/`) and choose **Continue as the demo owner**. To try the other roles, sign in by email as `editor@example.com`, `support@example.com` or `mod@example.com`.
- **Start over:** stop the server and delete `Go/data/`.

## What works

- **Watching:** Home (rotating banner, continue watching, trending, picks), rankings, new and coming soon, genres, search, Shorts, drama pages and the full-screen player. Episodes with an uploaded video play it; the sample episodes play a timed preview.
- **Coins and VIP:** free episodes, unlock with coins, rewarded ads (3 a day), auto-unlock, daily check-in with streaks, tasks (watch 30 minutes, notifications, invite a friend, sign in), coin packs, VIP plans, wallet and purchase history. Locked videos are only streamed to viewers who unlocked them.
- **Accounts:** guest accounts that upgrade on sign-in, profile, settings, notification preferences, inbox, help messages and account deletion.
- **Community:** episode comments, reporting, and moderation with hide and mute.
- **Admin:** a live dashboard; dramas with poster and banner upload; episode video upload with bulk free, locked and publish controls; Home curation; users with coin adjustments and bans; payments with recheck and CSV export; comment moderation; coin, VIP and reward settings; notifications sent now or on a schedule; app versions, maintenance mode, admin roles and the audit log.

Simulated for the demo: email codes are not sent (the code is shown on screen), "Continue with Google" makes a new account, the checkout lets you choose the store's answer (paid, pending or declined), ads are a 5-second placeholder, and notifications go to the in-app inbox only.

## Repository

| Folder | What |
| --- | --- |
| [`Go/`](Go/) | API server: Go, SQLite. Also serves the built web app. |
| [`NextJS/`](NextJS/) | Viewer web app at `/` and admin panel at `/admin`, as a static export. |
| [`Kotlin/`](Kotlin/) | Android app: Kotlin, Jetpack Compose, Media3. |
| [`Swift/`](Swift/) | iOS app: SwiftUI, AVPlayer. |
| [`design/`](design/), [`docs/DESIGN.md`](docs/DESIGN.md) | Claude Design artboards (54 app + 16 admin), logo, screen inventory. |

## Product model

- Free first episodes, then each episode unlocks with coins, a rewarded ad, or VIP.
- VIP unlocks every episode with no ads.
- Daily check-in and tasks give free coins.

## License

[MIT](LICENSE). Free for everyone to use, copy, change and sell, as long as the copyright notice stays in.
