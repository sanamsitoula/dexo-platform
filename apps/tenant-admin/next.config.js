/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dexo/ui'],
  // Lint runs as its own (non-blocking) CI step; don't let `next build` fail
  // on the eslint/prettier baseline. Types are enforced by the type-check job.
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  // Path-based tenant routing: this app is always reached at
  // <tenant>.onedexo.com/admin (nginx dispatches by path, not by an
  // admin.<tenant>. subdomain — see infra/nginx/dexo.conf).
  basePath: '/admin',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
