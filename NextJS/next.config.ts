import type { NextConfig } from 'next'

// Static export served by Apache from public_html/dist. Every route is pre-rendered to
// <route>/index.html (trailingSlash) so Apache can serve it without a client router.
const nextConfig: NextConfig = {
  agentRules: false,
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
}

export default nextConfig
