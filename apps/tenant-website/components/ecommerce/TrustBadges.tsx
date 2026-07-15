/** Reassurance row — free shipping, secure payments, easy returns, support.
 * Pure presentation from builder `content` (no live data). Lifts conversion
 * by surfacing trust signals high on the page. */
export default function TrustBadges({ content }: { content: any }) {
  const items: Array<{ icon?: string; title?: string; description?: string }> = content?.items || [];
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      {content?.title && <h2 className="mb-8 text-center text-2xl font-bold">{content.title}</h2>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-2xl px-4 py-6 text-center transition-transform duration-300 hover:-translate-y-1"
            style={{
              backgroundColor: 'var(--site-surface)',
              border: '1px solid var(--site-border)',
              borderRadius: 'var(--site-radius)',
            }}
          >
            {it.icon && <span className="mb-3 text-4xl">{it.icon}</span>}
            {it.title && <h3 className="font-semibold">{it.title}</h3>}
            {it.description && <p className="mt-1 text-sm opacity-70">{it.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
