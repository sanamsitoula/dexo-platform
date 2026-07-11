import { headers } from 'next/headers';

/**
 * Dynamic, per-tenant robots.txt — every business gets a correct sitemap
 * pointer without any manual setup. Works on both platform subdomains and
 * verified custom domains (the Host header is already tenant-resolved by
 * middleware.ts before this route runs).
 */
export async function GET() {
  const h = headers();
  const host = h.get('host') || 'onedexo.com';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const base = `${proto}://${host}`;

  const body = `User-agent: *
Allow: /
Disallow: /login
Disallow: /register

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
