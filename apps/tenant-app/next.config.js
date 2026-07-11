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
  ...(process.env.ENABLE_PATH_ROUTING === 'true'
    ? { basePath: '/dexo/app' }
    : process.env.TENANT_PATH_MODE === 'true'
      ? { basePath: '/app' }
      : {}),
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
