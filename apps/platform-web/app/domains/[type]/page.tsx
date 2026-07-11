'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Template {
  domainType: string;
  name: string;
  tagline: string;
  description: string;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  websiteSections: Record<string, any>;
  features: Record<string, boolean>;
}

export default function DomainDetail() {
  const params = useParams();
  const slug = (params?.type as string) || '';
  const domainType = slug.toUpperCase().replace(/-/g, '_');
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/business-templates/${domainType}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setTemplate)
      .catch(() => {});
  }, [domainType]);

  if (!template) {
    return (
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center">
        <div className="p-12 text-center text-zinc-500">Loading...</div>
      </div>
    );
  }

  const sections = Object.entries(template.websiteSections || {}).filter(([_, v]: any) => v?.enabled);

  return (
    // Chrome (bg/typography/spacing) is dark-cinematic; the accent color driving
    // links/badges/CTAs still comes from the API per business type — do not
    // hardcode that part, it's intentionally per-industry.
    <div
      style={{ ['--domain-accent' as any]: template.colorPrimary, ['--domain-accent-2' as any]: template.colorAccent }}
      className="min-h-screen bg-[#05050a]"
    >
      <div
        className="h-64 w-full opacity-30 blur-3xl absolute inset-x-0 top-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 30% 20%, ${template.colorPrimary}, transparent 60%)` }}
      />
      <div className="relative max-w-4xl mx-auto py-20 px-4">
        <Link href="/domains" className="text-sm text-zinc-400 hover:text-white transition-colors">← All industries</Link>

        <div className="mt-6 flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${template.colorPrimary}, ${template.colorAccent})` }}
          />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">{template.domainType}</span>
        </div>

        <h1
          className="mt-4 text-5xl sm:text-6xl font-extrabold text-white"
          style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
        >
          {template.name}
        </h1>
        <p className="mt-3 text-xl font-medium" style={{ color: template.colorPrimary }}>{template.tagline}</p>
        <p className="mt-4 text-lg text-zinc-400 leading-relaxed max-w-2xl">{template.description}</p>

        <div className="mt-14">
          <h2 className="text-2xl font-bold text-white mb-5">Sections included</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sections.map(([key, val]: any) => (
              <div key={key} className="glass-card p-4 text-sm">
                <div className="font-semibold capitalize text-white">{key}</div>
                {val.label && <div className="text-xs text-zinc-500 mt-0.5">{val.label}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold text-white mb-5">Features</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(template.features || {}).filter(([_, v]) => v).map(([k]) => (
              <span
                key={k}
                className="px-3 py-1 rounded-full text-sm border border-white/10 bg-white/5 backdrop-blur-md"
                style={{ color: template.colorAccent }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-10 border-t border-white/10">
          <Link
            href={`/signup/create?industry=${template.domainType}`}
            className="inline-block px-6 py-3.5 rounded-full font-semibold text-black shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${template.colorPrimary}, ${template.colorAccent})` }}
          >
            Start with {template.name} →
          </Link>
        </div>
      </div>
    </div>
  );
}
