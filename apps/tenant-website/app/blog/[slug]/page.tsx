import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import DOMPurify from 'isomorphic-dompurify';
import { getTenantBySubdomain, getBlogBySlug } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || '';
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getBlogBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
  };
}

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const subdomain = resolveSubdomain();
  const [tenant, theme, post] = await Promise.all([
    getTenantBySubdomain(subdomain),
    getSiteTheme(subdomain),
    getBlogBySlug(params.slug),
  ]);
  const name = tenant?.name || 'Blog';

  // Slugs are globally unique so this post can't belong to another tenant by
  // ID collision — but guard against a stale/foreign link being followed onto
  // this site by hostname.
  if (!post || (post.tenant?.subdomain && post.tenant.subdomain !== subdomain)) {
    notFound();
  }

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={name} active="/blog" />

      <article className="px-4 py-16 max-w-3xl mx-auto">
        <Link href="/blog" className="text-sm font-semibold hover:underline" style={{ color: 'var(--site-primary)' }}>
          ← Back to blog
        </Link>

        {post.category && (
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--site-primary)' }}>
            {post.category.name}
          </p>
        )}
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{post.title}</h1>
        <div className="mt-4 text-sm" style={{ color: 'var(--site-sub)' }}>
          {post.author.firstName} {post.author.lastName} · {formatDate(post.publishedAt)}
        </div>

        {post.featuredImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featuredImage} alt={post.title} className="mt-8 w-full rounded-lg object-cover" style={{ borderRadius: 'var(--site-radius)' }} />
        )}

        <div
          className="mt-8 prose max-w-none"
          style={{ color: 'var(--site-text)' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
        />
      </article>

      <SiteFooter theme={theme} name={name} />
    </div>
  );
}
