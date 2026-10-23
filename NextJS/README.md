# The Ending · Web (Next.js)

One Next.js app serves both:

- **The viewer web app** at `/` — the same screens as the mobile apps, laid out responsively (sidebar instead of bottom tabs on wide screens).
- **The admin panel** at `/admin` — dramas, episodes and video upload, Home curation, users, payments, comments, coins/VIP/rewards, push notifications and settings.

All data comes from the Go backend. Admin permissions are enforced by the backend on every request; the Next.js `/admin` route guard only improves the experience.

Designs and the full route list: [docs/DESIGN.md](../docs/DESIGN.md). Not started yet.
