import DOMPurify from 'isomorphic-dompurify';
import type { PublicPageSection } from '@/lib/api';
import PublicFormRenderer from './PublicFormRenderer';

/** Renders one PageSection per its componentType — the Component Library's
 * public-facing counterpart to tenant-admin's editable field forms (see
 * packages/shared/src/page-builder/components.ts for the field defs). */
export default function PageSectionRenderer({ section, colorPrimary, subdomain }: { section: PublicPageSection; colorPrimary?: string; subdomain: string }) {
  const color = colorPrimary || '#4F46E5';
  const c = section.content || {};

  switch (section.componentType) {
    case 'form':
      return c.formId ? <PublicFormRenderer subdomain={subdomain} formId={c.formId} colorPrimary={color} /> : null;
    case 'hero':
      return (
        <section className="relative px-4 py-24 text-center" style={c.image ? { backgroundImage: `url(${c.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
          <div className={c.image ? 'bg-black/40 absolute inset-0' : ''} />
          <div className="relative max-w-3xl mx-auto">
            {c.title && <h1 className={`text-4xl font-extrabold ${c.image ? 'text-white' : ''}`}>{c.title}</h1>}
            {c.subtitle && <p className={`mt-4 text-lg ${c.image ? 'text-white/90' : 'opacity-70'}`}>{c.subtitle}</p>}
            {c.ctaLabel && c.ctaUrl && (
              <a href={c.ctaUrl} className="inline-block mt-6 px-6 py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: color }}>{c.ctaLabel}</a>
            )}
          </div>
        </section>
      );

    case 'richtext':
      return c.html ? (
        <section className="px-4 py-12 max-w-3xl mx-auto prose prose-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.html) }} />
      ) : null;

    case 'cta':
      return (
        <section className="px-4 py-16 text-center max-w-2xl mx-auto">
          {c.title && <h2 className="text-2xl font-bold">{c.title}</h2>}
          {c.subtitle && <p className="mt-2 opacity-70">{c.subtitle}</p>}
          {c.ctaLabel && c.ctaUrl && (
            <a href={c.ctaUrl} className="inline-block mt-5 px-6 py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: color }}>{c.ctaLabel}</a>
          )}
        </section>
      );

    case 'features':
      return (
        <section className="px-4 py-16 max-w-6xl mx-auto">
          {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(c.items || []).map((it: any, i: number) => (
              <div key={i} className="p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg">{it.title}</h3>
                {it.description && <p className="text-sm opacity-70 mt-2">{it.description}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="px-4 py-16 max-w-5xl mx-auto">
          {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(c.items || []).map((it: any, i: number) => (
              <blockquote key={i} className="p-6 rounded-xl border border-gray-200">
                {it.photo && <img src={it.photo} alt={it.author} className="w-12 h-12 rounded-full object-cover mb-3" />}
                <p className="italic opacity-80">&ldquo;{it.quote}&rdquo;</p>
                {it.author && <footer className="mt-3 font-semibold text-sm">— {it.author}</footer>}
              </blockquote>
            ))}
          </div>
        </section>
      );

    case 'pricing':
      return (
        <section className="px-4 py-16 max-w-6xl mx-auto">
          {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(c.items || []).map((it: any, i: number) => (
              <div key={i} className="p-6 rounded-xl border border-gray-200 flex flex-col">
                <h3 className="font-bold text-lg">{it.name}</h3>
                {it.price && <div className="text-2xl font-extrabold mt-2" style={{ color }}>{it.price}</div>}
                {it.description && <p className="text-sm opacity-70 mt-3 flex-1">{it.description}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="px-4 py-16 max-w-3xl mx-auto">
          {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
          <div className="space-y-2">
            {(c.items || []).map((it: any, i: number) => (
              <details key={i} className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold cursor-pointer">{it.question}</summary>
                {it.answer && <p className="text-sm opacity-70 mt-3">{it.answer}</p>}
              </details>
            ))}
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section className="px-4 py-16 max-w-6xl mx-auto">
          {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(c.items || []).map((it: any, i: number) => (
              <figure key={i} className="rounded-lg overflow-hidden bg-gray-50 aspect-square">
                {it.image && <img src={it.image} alt={it.caption || ''} className="w-full h-full object-cover" />}
                {it.caption && <figcaption className="text-xs text-center py-1 opacity-70">{it.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      );

    case 'team':
      return (
        <section className="px-4 py-16 max-w-5xl mx-auto">
          {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {(c.items || []).map((it: any, i: number) => (
              <div key={i} className="text-center">
                {it.photo && <img src={it.photo} alt={it.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />}
                <div className="font-semibold">{it.name}</div>
                {it.role && <div className="text-xs opacity-60">{it.role}</div>}
              </div>
            ))}
          </div>
        </section>
      );

    case 'contact':
      return (
        <section className="px-4 py-16 max-w-2xl mx-auto text-center">
          {c.title && <h2 className="text-3xl font-bold mb-6">{c.title}</h2>}
          <div className="space-y-1 text-sm opacity-80">
            {c.address && <p>{c.address}</p>}
            {c.phone && <p>{c.phone}</p>}
            {c.email && <p>{c.email}</p>}
          </div>
          {c.mapUrl && <a href={c.mapUrl} className="inline-block mt-4 text-sm underline" style={{ color }}>View on map</a>}
        </section>
      );

    case 'newsletter':
      return (
        <section className="px-4 py-16 max-w-xl mx-auto text-center">
          {c.title && <h2 className="text-2xl font-bold">{c.title}</h2>}
          {c.subtitle && <p className="mt-2 opacity-70">{c.subtitle}</p>}
          <form className="mt-5 flex gap-2 max-w-sm mx-auto">
            <input type="email" required placeholder="you@example.com" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="px-4 py-2 rounded-lg font-semibold text-white text-sm" style={{ backgroundColor: color }}>{c.ctaLabel || 'Subscribe'}</button>
          </form>
        </section>
      );

    default:
      return null;
  }
}
