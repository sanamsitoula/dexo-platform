import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublicMenu, getTenantBySubdomain } from '@/lib/api';
import MenuSection from '@/components/MenuSection';

function resolveSubdomain(): string {
  return headers().get('x-tenant-slug') || '';
}

export default async function MenuPage({ params }: { params: { slug: string } }) {
  const subdomain = resolveSubdomain();
  const [menu, tenant] = await Promise.all([
    getPublicMenu(subdomain, params.slug),
    getTenantBySubdomain(subdomain),
  ]);
  if (!menu) notFound();

  const colorPrimary = (tenant?.settings as any)?.branding?.colorPrimary;

  return (
    <div className="min-h-screen">
      <MenuSection menu={menu} colorPrimary={colorPrimary} />
    </div>
  );
}
