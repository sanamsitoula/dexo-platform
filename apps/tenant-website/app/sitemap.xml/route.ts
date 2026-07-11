import { headers } from 'next/headers';

// Always-present marketing pages, common to every business vertical.
const STATIC_PATHS = ['/', '/about', '/services', '/book', '/contact', '/register'];

// NOTE: ecommerce tenants don't have a /shop/:slug product page yet (the
// storefront catalog UI is roadmap — see docs/ECOMMERCE_MODULE.md). Product
// URLs are deliberately NOT included here until that page exists; adding
// them now would ship a sitemap full of 404s. Once /shop/[slug]/page.tsx
// lands, fetch `${API_URL}/api/ecommerce/public/${slug}/products` here and
// map to `/shop/${p.slug}`.

/**
 * Dynamic, per-tenant sitemap.xml — every business gets a correct sitemap
 * with zero manual setup, on both platform subdomains and custom domains.
 */
export async function GET() {
  const h = headers();
  const host = h.get('host') || 'onedexo.com';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const base = `${proto}://${host}`;

  const paths = STATIC_PATHS;

  const urls = paths
    .map((p) => `  <url><loc>${base}${p}</loc><changefreq>daily</changefreq></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
