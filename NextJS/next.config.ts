import type { NextConfig } from 'next'

// Production: a static export (out/) that the Go server serves next to /api, so one process runs
// the whole app. Every route is pre-rendered to <route>/index.html (trailingSlash).
// Development: `next dev` proxies /api to the Go server (API_URL, default http://127.0.0.1:8080).
const dev = process.env.NODE_ENV === 'development'
const api = process.env.API_URL ?? 'http://127.0.0.1:8080'

const nextConfig: NextConfig = {
  agentRules: false,
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  ...(dev
    ? {
        // API paths have no trailing slash; don't redirect them before the proxy.
        skipTrailingSlashRedirect: true,
        async rewrites() {
          return [{ source: '/api/:path*', destination: `${api}/api/:path*` }]
        },
      }
    : { output: 'export' as const }),
}

export default nextConfig
