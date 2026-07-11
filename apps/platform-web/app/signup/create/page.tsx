'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

const STEPS = [
  { key: 'industry',  title: 'Choose your industry' },
  { key: 'basics',    title: 'Business basics' },
  { key: 'services',  title: 'Configure services' },
  { key: 'branding',  title: 'Branding' },
  { key: 'subdomain', title: 'Choose subdomain' },
  { key: 'plan',      title: 'Plan & payment' },
];

interface Template {
  id: string;
  domainType: string;
  name: string;
  tagline: string;
  description: string;
  colorPrimary: string;
  features: Record<string, boolean>;
  onboardingSteps: Array<{ step: number; title: string; fields: string[] }>;
}

export default function SignupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [data, setData] = useState<any>({
    name: '',
    phone: '',
    address: '',
    domainType: '',
    logo: '',
    coverImage: '',
    colorPrimary: '#1f2937',
    colorAccent: '#3b82f6',
    slug: '',
    plan: 'STARTER',
  });
  const [slugStatus, setSlugStatus] = useState<{ available: boolean; reason?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/business-templates`).then((r) => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const current = STEPS[step];

  function next() { if (step < STEPS.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  async function checkSlug() {
    if (!data.slug) return;
    const res = await fetch(`${API_URL}/api/tenants/check-slug?slug=${encodeURIComponent(data.slug)}`);
    setSlugStatus(await res.json());
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Public self-service signup endpoint (validates slug + provisions tenant +
      // owner). NOTE: POST /api/tenants is PlatformAdmin-only and 401s here.
      const res = await fetch(`${API_URL}/api/tenants/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: data.slug,
          name: data.name,
          domainType: data.domainType,
          ownerEmail: data.ownerEmail || `${data.slug}@${PLATFORM_DOMAIN}`,
          ownerPassword: data.ownerPassword || 'Welcome123!',
          ownerFirstName: data.ownerFirstName || data.name,
          ownerLastName: data.ownerLastName || 'Owner',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed (${res.status})`);
      }
      const result = await res.json();
      router.push(`/signup/success?tenant=${result.tenantId}&sub=${result.subdomain}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Create your tenant</h1>
          <p className="mt-2 text-gray-500">6 quick steps and your platform is live.</p>
        </div>

        <ol className="flex justify-between mb-8">
          {STEPS.map((s, i) => (
            <li key={s.key} className={`flex-1 text-center text-xs ${i === step ? 'text-slate-900 font-semibold' : 'text-gray-400'}`}>
              <div className={`mx-auto h-8 w-8 rounded-full flex items-center justify-center ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-slate-900 text-white' : 'bg-gray-200'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <div className="mt-1 hidden sm:block">{s.title}</div>
            </li>
          ))}
        </ol>

        <div className="bg-white shadow rounded-lg p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

          {current.key === 'industry' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Choose your industry</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((t) => (
                  <button
                    key={t.domainType}
                    onClick={() => setData({ ...data, domainType: t.domainType })}
                    className={`p-4 border-2 rounded-lg text-left transition ${data.domainType === t.domainType ? 'border-slate-900 ring-2 ring-slate-900' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="h-8 w-8 rounded mb-2" style={{ backgroundColor: t.colorPrimary }} />
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.tagline}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current.key === 'basics' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Business basics</h2>
              <input
                placeholder="Business name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Phone"
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Address"
                value={data.address}
                onChange={(e) => setData({ ...data, address: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Owner email"
                type="email"
                value={data.ownerEmail || ''}
                onChange={(e) => setData({ ...data, ownerEmail: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          )}

          {current.key === 'services' && (
            <div>
              <h2 className="text-xl font-bold">Configure services</h2>
              <p className="text-sm text-gray-500 mt-1">
                You can enable/disable any module later from the admin panel.
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-md">
                Default services will be enabled for {data.domainType || 'your tenant'}. You can customize after signup.
              </div>
            </div>
          )}

          {current.key === 'branding' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Branding</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700">Primary color</label>
                  <input
                    type="color"
                    value={data.colorPrimary}
                    onChange={(e) => setData({ ...data, colorPrimary: e.target.value })}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Accent color</label>
                  <input
                    type="color"
                    value={data.colorAccent}
                    onChange={(e) => setData({ ...data, colorAccent: e.target.value })}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
              </div>
              <input
                placeholder="Logo URL (optional)"
                value={data.logo}
                onChange={(e) => setData({ ...data, logo: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          )}

          {current.key === 'subdomain' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Choose your subdomain</h2>
              <div className="flex rounded-md border border-gray-300 overflow-hidden">
                <input
                  placeholder="your-tenant"
                  value={data.slug}
                  onChange={(e) => setData({ ...data, slug: e.target.value.toLowerCase() })}
                  onBlur={checkSlug}
                  className="flex-1 px-3 py-2 outline-none"
                />
                <span className="bg-gray-100 px-3 py-2 text-gray-500 text-sm">.{PLATFORM_DOMAIN}</span>
              </div>
              {slugStatus && (
                <div className={`text-sm ${slugStatus.available ? 'text-emerald-600' : 'text-red-600'}`}>
                  {slugStatus.available ? '✓ Available' : `✗ ${slugStatus.reason || 'unavailable'}`}
                </div>
              )}
            </div>
          )}

          {current.key === 'plan' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Choose your plan</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setData({ ...data, plan: p })}
                    className={`p-4 border-2 rounded-lg text-sm font-semibold ${data.plan === p ? 'border-slate-900 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500">Payment integration coming soon. Free trial activated by default.</p>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button onClick={prev} disabled={step === 0} className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50">
              Back
            </button>
            {step === STEPS.length - 1 ? (
              <button onClick={submit} disabled={submitting || !slugStatus?.available} className="px-6 py-2 bg-emerald-600 text-white rounded-md disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create tenant'}
              </button>
            ) : (
              <button onClick={next} disabled={!data.name && step >= 1} className="px-4 py-2 bg-slate-900 text-white rounded-md disabled:opacity-50">
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
