import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { DOCS, readDoc } from '../docs-registry';

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const doc = DOCS[params.slug];
  return doc
    ? { title: `${doc.title} — Dexo Docs`, description: doc.description }
    : { title: 'Dexo Docs' };
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = DOCS[params.slug];
  const md = readDoc(params.slug);
  if (!doc || !md) notFound();

  const html = marked.parse(md, { async: false }) as string;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/docs" className="text-sm font-semibold" style={{ color: 'var(--dx-primary, #4F46E5)' }}>← All docs</Link>
      <article className="dx-doc mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
