/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dexo/ui'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  ...(process.env.ENABLE_PATH_ROUTING === 'true'
    ? { basePath: '/dexo/tenant-admin' }
    : process.env.TENANT_PATH_MODE === 'true'
      ? { basePath: '/admin' }
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
