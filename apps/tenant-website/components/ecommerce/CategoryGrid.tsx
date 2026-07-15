import Link from 'next/link';
import { getCategories } from '@/lib/api';

/** Live tiles of the tenant's store categories. Categories have no image
 * column in the schema, so tiles use a branded gradient + the category's
 * initial — clean, premium, and always on-brand (uses --site-primary). */
export default async function CategoryGrid({ subdomain, content }: { subdomain: string; content: any }) {
  const cats = (await getCategories(subdomain))
    .filter((c) => c.slug !== 'uncategorized')
    .slice(0, 8);
  if (cats.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 text-center">
        {content?.title && <h2 className="text-3xl font-bold sm:text-4xl">{content.title}</h2>}
        {content?.subtitle && <p className="mt-3 opacity-70">{content.subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((c) => (
          <Link
            key={c.id}
            href={`/shop?category=${c.id}`}
            className="group relative flex aspect-[4/3] items-end overflow-hidden p-5 font-semibold transition-transform duration-300 hover:-translate-y-1"
            style={{
              borderRadius: 'var(--site-radius)',
              background: 'linear-gradient(135deg, var(--site-primary), var(--site-accent, var(--site-primary)))',
              color: 'var(--site-on-primary, #fff)',
            }}
          >
            <span className="pointer-events-none absolute right-3 top-2 text-5xl font-black opacity-20 transition-transform duration-500 group-hover:scale-125">
              {(c.name || '?').charAt(0).toUpperCase()}
            </span>
            <span className="relative text-lg">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
