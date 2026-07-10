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

  if (!template) return <div className="p-12 text-center text-gray-500">Loading...</div>;

  const sections = Object.entries(template.websiteSections || {}).filter(([_, v]: any) => v?.enabled);

  return (
    <div style={{ background: template.colorBg, color: template.colorPrimary }} className="min-h-screen">
      <div className="max-w-4xl mx-auto py-16 px-4">
        <Link href="/domains" className="text-sm opacity-70 hover:opacity-100">← All industries</Link>
        <h1 className="mt-4 text-5xl font-extrabold">{template.name}</h1>
        <p className="mt-3 text-xl opacity-80">{template.tagline}</p>
        <p className="mt-4 text-lg opacity-70">{template.description}</p>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Sections included</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sections.map(([key, val]: any) => (
              <div key={key} className="bg-white/80 rounded-lg p-3 text-sm" style={{ color: template.colorPrimary }}>
                <div className="font-semibold capitalize">{key}</div>
                {val.label && <div className="text-xs opacity-60">{val.label}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Features</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(template.features || {}).filter(([_, v]) => v).map(([k]) => (
              <span key={k} className="px-3 py-1 rounded-full text-sm bg-white/80" style={{ color: template.colorPrimary }}>{k}</span>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <Link href={`/signup/create?industry=${template.domainType}`} className="inline-block px-6 py-3 bg-white rounded-md font-semibold" style={{ color: template.colorPrimary }}>
            Start with {template.name} →
          </Link>
        </div>
      </div>
    </div>
  );
}
