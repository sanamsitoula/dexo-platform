/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@dexo/ui', '@dexo/shared'],
}

module.exports = nextConfig
