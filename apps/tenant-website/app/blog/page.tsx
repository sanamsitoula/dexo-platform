import Link from 'next/link';
import { headers } from 'next/headers';
import { getTenantBySubdomain, getTenantBlogs } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || '';
}

const card = {
  backgroundColor: 'var(--site-surface)',
  border: '1px solid var(--site-border)',
  borderRadius: 'var(--site-radius)',
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const subdomain = resolveSubdomain();
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  const [tenant, theme, blogs] = await Promise.all([
    getTenantBySubdomain(subdomain),
    getSiteTheme(subdomain),
    getTenantBlogs(subdomain, { page, limit: 9 }),
  ]);
  const name = tenant?.name || 'Blog';
  const { data: posts, meta } = blogs;

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={name} active="/blog" />

      <section className="text-center px-4 py-16 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-widest" style={{ color: 'var(--site-sub)' }}>Blog</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight">News &amp; updates from {name}</h1>
      </section>

      <section className="px-4 pb-16 max-w-6xl mx-auto">
        {posts.length === 0 ? (
          <p className="text-center py-10" style={{ color: 'var(--site-sub)' }}>
            No posts yet. Check back soon.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="flex flex-col overflow-hidden hover:opacity-90 transition-opacity"
                  style={card}
                >
                  {post.featuredImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.featuredImage} alt={post.title} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 flex items-center justify-center text-4xl" style={{ background: 'var(--site-accent)', color: 'var(--site-on-accent)' }}>
                      📰
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    {post.category && (
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--site-primary)' }}>
                        {post.category.name}
                      </span>
                    )}
                    <h2 className="mt-2 font-bold text-lg leading-snug">{post.title}</h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm flex-1" style={{ color: 'var(--site-sub)' }}>{post.excerpt}</p>
                    )}
                    <div className="mt-4 text-xs" style={{ color: 'var(--site-sub)' }}>
                      {post.author.firstName} {post.author.lastName} · {formatDate(post.publishedAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-10 flex justify-center gap-3">
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}`}
                    className="px-5 py-2 font-semibold border hover:opacity-80"
                    style={{ borderColor: 'var(--site-border)', borderRadius: 'var(--site-radius)' }}
                  >
                    ← Newer
                  </Link>
                )}
                {page < meta.totalPages && (
                  <Link
                    href={`/blog?page=${page + 1}`}
                    className="px-5 py-2 font-semibold border hover:opacity-80"
                    style={{ borderColor: 'var(--site-border)', borderRadius: 'var(--site-radius)' }}
                  >
                    Older →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <SiteFooter theme={theme} name={name} />
    </div>
  );
}
