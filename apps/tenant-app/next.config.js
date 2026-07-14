/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@dexo/shared', '@dexo/ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  // Path-based tenant routing: this app is always reached at
  // <tenant>.onedexo.com/portal (nginx dispatches by path, not by a
  // portal.<tenant>. subdomain — see infra/nginx/dexo.conf).
  basePath: '/portal',
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
