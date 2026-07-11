'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Template {
  id: string;
  domainType: string;
  name: string;
  tagline: string;
  colorPrimary: string;
  colorAccent: string;
}

export default function DomainsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/business-templates`).then((r) => r.json()).then(setTemplates).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#05050a] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold text-white"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            12 industry-specific platforms
          </h1>
          <p className="mt-4 text-lg text-zinc-400">Each tenant gets a fully-configured platform tailored to its industry.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <Link
              key={t.domainType}
              href={`/domains/${t.domainType.toLowerCase().replace(/_/g, '-')}`}
              className="glass-card glass-card-hover p-6 group relative overflow-hidden"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${t.colorPrimary}, ${t.colorAccent})` }}
              />
              <div
                className="h-10 w-10 rounded-lg mb-4 shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                style={{ background: `linear-gradient(135deg, ${t.colorPrimary}, ${t.colorAccent})` }}
              />
              <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">{t.name}</h3>
              <p className="mt-1 text-sm text-zinc-400">{t.tagline}</p>
              <div className="mt-4 text-xs text-zinc-500 font-mono">{t.domainType}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
