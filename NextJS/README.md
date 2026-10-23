# The Ending · Web (Next.js)

**Mockup with dummy data**, live at https://the-ending.connexbiz.com/

One Next.js app serves both:

- **The viewer web app** at `/`: the same screens as the mobile apps, laid out responsively (bottom tabs on phones, sidebar on desktop).
- **The admin panel** at `/admin`: dramas, episode upload, Home curation, users, payments, comments, coins/VIP/rewards, push notifications and settings.

## Mockup status

- All data comes from [src/data/dummy.ts](src/data/dummy.ts). Nothing talks to a server yet.
- Viewer state (sign-in, coins, saved list, unlocked episodes, VIP, check-ins) lives in this browser's `localStorage` ([src/lib/demo-store.ts](src/lib/demo-store.ts)). The "Reset" link in the demo bar clears it.
- Sign-in, payments, ads and uploads are simulated. No email is sent, nothing is charged, uploaded files never leave the browser.
- The email code is `123456`. The admin panel opens from `/admin/login/` with either demo button.
- Video playback is simulated with timed placeholders until real HLS streams exist.

When the Go backend is ready, replace the dummy module and demo store with API calls. The real admin panel must be authorised by GoBackend admin roles on every request; the Next.js `/admin` guard only improves the experience.

## Develop

```bash
npm ci
npm run dev        # http://127.0.0.1:3000
npm run typecheck && npm run lint && npm run build   # static export to out/
```

## Deploy

`scripts/deploy.sh` (from a clean, committed tree) uploads the source to the production server, builds it there as `wayne`, swaps `public_html/dist` to the new release, checks the key routes and rolls back if any check fails. The previous release is removed one hour after a successful deploy.

Designs and the full route list: [docs/DESIGN.md](../docs/DESIGN.md).
