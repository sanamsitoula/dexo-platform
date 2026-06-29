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
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">12 industry-specific platforms</h1>
          <p className="mt-3 text-lg text-gray-600">Each tenant gets a fully-configured platform tailored to its industry.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <Link
              key={t.domainType}
              href={`/domains/${t.domainType.toLowerCase().replace(/_/g, '-')}`}
              className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 group"
            >
              <div className="h-10 w-10 rounded-lg mb-4" style={{ background: `linear-gradient(135deg, ${t.colorPrimary}, ${t.colorAccent})` }} />
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-slate-700">{t.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{t.tagline}</p>
              <div className="mt-4 text-xs text-slate-600 font-mono">{t.domainType}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
