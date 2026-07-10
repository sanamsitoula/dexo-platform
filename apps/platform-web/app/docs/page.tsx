import Link from 'next/link';
import { DOCS } from './docs-registry';

export const metadata = {
  title: 'Documentation — Dexo Platform',
  description: 'Brand guidelines and developer documentation for building on Dexo.',
};

export default function DocsIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold" style={{ color: 'var(--dx-text, #18181B)' }}>Documentation</h1>
      <p className="mt-3 text-lg" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
        Everything you need to build on the Dexo platform — the brand system, the architecture,
        and step-by-step guides for extending tenants with your own modules and integrations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {Object.entries(DOCS).map(([slug, d]) => (
          <Link
            key={slug}
            href={`/docs/${slug}`}
            className="block border p-6 transition hover:shadow-dx-md"
            style={{ borderColor: 'var(--dx-border, #E4E4E7)', borderRadius: 'var(--dx-radius, 10px)', background: 'var(--dx-surface-1, #fff)' }}
          >
            <div className="text-lg font-semibold" style={{ color: 'var(--dx-primary, #4F46E5)' }}>{d.title}</div>
            <p className="text-sm mt-2 leading-6" style={{ color: 'var(--dx-text-muted, #52525B)' }}>{d.description}</p>
            <span className="inline-block mt-4 text-sm font-semibold" style={{ color: 'var(--dx-primary, #4F46E5)' }}>Read →</span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm" style={{ color: 'var(--dx-text-muted, #52525B)' }}>
        Full brand asset library (logo, color, typography, motion, launch kits) lives in the
        repository under <code className="font-mono">brand/</code>; deeper architecture docs under <code className="font-mono">docs/</code>.
      </p>
    </div>
  );
}
