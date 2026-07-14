import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getPublicPage, getTenantBySubdomain } from '@/lib/api';
import PageSectionRenderer from '@/components/PageSectionRenderer';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || '';
}

/** Renders a tenant's Page Builder pages at /<slug> — falls through to
 * Next's normal not-found handling for any slug that isn't a published
 * page, which also means a static route (e.g. /about, /contact) always
 * wins over a same-named Page Builder page, since Next matches literal
 * segments before dynamic ones. */
export default async function TenantPage({ params }: { params: { slug: string } }) {
  const subdomain = resolveSubdomain();
  if (!subdomain) notFound();

  const page = await getPublicPage(subdomain, params.slug);
  if (!page) notFound();

  const tenant = await getTenantBySubdomain(subdomain);
  const colorPrimary = tenant?.settings?.branding?.colorPrimary;

  return (
    <div>
      {page.sections.map((section) => (
        <PageSectionRenderer key={section.id} section={section} colorPrimary={colorPrimary} subdomain={subdomain} />
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const subdomain = resolveSubdomain();
  if (!subdomain) return {};
  const page = await getPublicPage(subdomain, params.slug);
  if (!page) return {};
  return {
    title: page.metaTitle || page.name,
    description: page.metaDescription || undefined,
    alternates: page.canonicalUrl ? { canonical: page.canonicalUrl } : undefined,
    robots: { index: page.robotsIndex, follow: page.robotsFollow },
    openGraph: page.ogImage ? { images: [page.ogImage] } : undefined,
  };
}
