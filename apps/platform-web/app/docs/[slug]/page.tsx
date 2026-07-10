import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { DOCS, FILE_TO_SLUG, readDoc } from '../docs-registry';

/** Rewrite repo-relative .md links to their published /docs/<slug> pages. */
function rewriteDocLinks(html: string): string {
  return html.replace(/href="([^"]+\.md)(#[^"]*)?"/g, (match, href, hash) => {
    const filename = String(href).split('/').pop() as string;
    const slug = FILE_TO_SLUG[filename];
    return slug ? `href="/docs/${slug}${hash ?? ''}"` : match;
  });
}

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

  const html = rewriteDocLinks(marked.parse(md, { async: false }) as string);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/docs" className="text-sm font-semibold" style={{ color: 'var(--dx-primary, #4F46E5)' }}>← All docs</Link>
      <article className="dx-doc mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
