/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dexo/shared', '@dexo/ui'],
  // Activate with ENABLE_PATH_ROUTING=true in .env for nginx/ngrok single-URL
  // demo setup. Leave unset for production (host-based routing needs no basePath).
  ...(process.env.ENABLE_PATH_ROUTING === 'true' ? { basePath: '/dexo' } : {}),
  experimental: {
    optimizePackageImports: ['@dexo/ui'],
  },
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
