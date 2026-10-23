# The Ending · Web (Next.js)

One Next.js app serves both:

- **The viewer web app** at `/`: the same screens as the mobile designs, laid out responsively (bottom tabs on phones, sidebar on desktop).
- **The admin panel** at `/admin`: dashboard, dramas and episode upload, Home curation, users, payments, comments, coins/VIP/rewards, notifications and settings.

All data comes from the Go API ([../Go](../Go)). The app is a static export; the Go server serves it, so production is one process.

## Develop

Start the API first, then the dev server:

```bash
cd ../Go && go run .          # API on http://127.0.0.1:8080
npm ci
npm run dev                   # http://127.0.0.1:3000, /api proxied to the Go server
```

Set `API_URL` if the API runs elsewhere. Before committing: `npm run typecheck && npm run lint && npm run build`.

## How it's built

- [src/lib/api.ts](src/lib/api.ts): fetch wrapper and upload with progress. The session is an HttpOnly cookie set by the API.
- [src/lib/data.ts](src/lib/data.ts): small shared cache for GET requests (`useApi`, `useCatalog`, `useConfig`).
- [src/lib/store.ts](src/lib/store.ts): the viewer's own state (`useMe`) and every action that changes it. A guest account is created on the first visit.
- Dynamic routes (`/drama/[id]`, `/watch/[id]`, `/admin/dramas/[id]`, `/admin/dramas/[id]/episodes`, `/admin/users/[id]`) are exported once with the id `_`. The Go server serves that page for any id, and the screen reads the id from the URL, so dramas added in the admin panel need no rebuild.
- Dates show as `dd/MM/yyyy` and times on a 12-hour clock ([src/lib/format.ts](src/lib/format.ts)).

Designs and the full route list: [docs/DESIGN.md](../docs/DESIGN.md).
