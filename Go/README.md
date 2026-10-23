# The Ending · Go API

The backend for The Ending: Go's standard `net/http` and SQLite through [`modernc.org/sqlite`](https://pkg.go.dev/modernc.org/sqlite) (pure Go, no C compiler needed). One process serves the JSON API at `/api/` and, once it's built, the Next.js static export at `/`.

```bash
go run .                 # http://127.0.0.1:8080
go test ./...            # integration tests against a temporary database
```

On first start it creates `data/the-ending.db` and fills it with sample data ([internal/api/seed.go](internal/api/seed.go)). Delete `data/` to start over.

## Configuration

All optional, through environment variables:

| Variable | Default | Use |
| --- | --- | --- |
| `ADDR` | `127.0.0.1:8080` | Listen address. Use `0.0.0.0:8080` to reach it from other devices on your network. |
| `DATA_DIR` | `data` | SQLite database and uploaded media (`media/images`, `media/videos`). |
| `WEB_DIR` | `../NextJS/out` | Built web app to serve at `/`. |
| `TIMEZONE` | `Asia/Yangon` | When a "day" starts for check-ins, ad limits and stats. |
| `DEMO_CODE` | `123456` | The mock email sign-in code. |
| `ALLOWED_ORIGINS` | `http://127.0.0.1:3000,http://localhost:3000` | Extra origins allowed to call the API (the Next.js dev server). |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS. |

## How it fits together

| File | Covers |
| --- | --- |
| [server.go](internal/api/server.go) | Config, routing helpers, access levels, sessions (HttpOnly cookie, hashed token), cross-site write check |
| [db.go](internal/api/db.go) | Schema and migrations (`PRAGMA user_version`) |
| [auth.go](internal/api/auth.go) | Guest accounts, mock Google and email-code sign-in, demo admin sign-in, sign-in bonus, referrals |
| [users.go](internal/api/users.go) | Users, roles, settings, app configuration, the viewer's `me` state |
| [catalog.go](internal/api/catalog.go) | Dramas, episodes, Home, rankings, search, public config |
| [viewer.go](internal/api/viewer.go) | Lists, progress, watch time, unlocks, rewarded ads, check-in, tasks, wallet, ratings |
| [payments.go](internal/api/payments.go) | Orders and the simulated store checkout, coin and VIP grants |
| [social.go](internal/api/social.go) | Comments and reports, inbox, help messages, ending VIP |
| [admin.go](internal/api/admin.go) | Dashboard, users, payments, moderation, monetization, notifications, settings, admins, audit log |
| [content.go](internal/api/content.go) | Admin dramas, episodes, uploads, Home curation; video streaming with unlock checks; images |
| [jobs.go](internal/api/jobs.go) | Every 30 s: scheduled notifications and premieres. Hourly: expired sessions, codes, tickets and idle guest accounts |
| [web.go](internal/api/web.go) | Routes, and serving the static export (dynamic routes such as `/drama/<id>/` use the exported `_` shell) |

### Rules the server enforces

- Every write checks the session; admin writes check the role. Owner can do everything; Editor: dramas, episodes, Home and notifications; Support: users, payments and coin adjustments; Moderator: comments. Every admin change goes to the audit log.
- Coins change only inside a transaction that also writes the wallet record, and a balance can't go below zero. Unlocking, completing a payment, claiming a task or an ad ticket never pays out twice.
- A rewarded ad pays only for a server-issued ticket at least 5 seconds old, within the daily limit.
- Locked episode videos are streamed only to viewers who unlocked them, have VIP, or when the episode is free.
- Banned accounts lose their sessions and can't sign in; muted accounts can't comment.

## API

Times are JavaScript milliseconds. Errors are `{"error": "message"}` with a matching status.

- **Auth:** `POST /api/auth/guest`, `/auth/google`, `/auth/email/start`, `/auth/email/verify`, `/auth/admin-demo`, `/auth/logout`
- **Catalog:** `GET /api/config`, `/dramas`, `/dramas/{id}`, `/home`, `/rankings`, `/search?q=`, `/search/trending`, `/episodes/{id}/{n}/video`, `/media/images/{name}`
- **Me:** `GET|PATCH|DELETE /api/me`, `PUT|DELETE /api/me/{saved|liked|reminders}/{id}`, `DELETE /api/me/history`, `POST /api/me/progress`, `/me/watch`, `/me/vip/cancel`
- **Coins:** `POST /api/unlock`, `/ads/start`, `/ads/complete`, `/checkin`, `/tasks/{key}/claim`, `GET /api/wallet`
- **Payments:** `GET|POST /api/payments`, `GET /api/payments/{order}`, `POST /api/payments/{order}/complete`
- **Social:** `GET|POST /api/comments`, `DELETE /api/comments/{id}`, `POST /api/comments/{id}/report`, `GET|DELETE /api/inbox`, `POST /api/inbox/read`, `POST /api/help`, `POST /api/ratings`
- **Admin** (`/api/admin/…`): `me`, `dashboard`, `dramas` (+ `/{id}`, `/{id}/image`, `/{id}/episodes`, `/{id}/episodes/{n}/video`), `home`, `users` (+ `/{id}`, `/{id}/coins`, `/{id}/ban`), `payments` (+ `/{order}/recheck`), `comments` (+ `/{id}`), `monetization`, `notifications` (+ `/test`, `/{id}`), `settings`, `admins` (+ `/{id}`)

## Before using it for real

Replace the mock pieces with real ones: email codes sent by an email service, Google and Apple sign-in, store receipt verification for Google Play and the App Store, an ad network's server-side reward callback, and push delivery. Then serve it over HTTPS with `COOKIE_SECURE=true`.
