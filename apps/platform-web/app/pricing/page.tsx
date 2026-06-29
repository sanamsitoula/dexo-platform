'use client';

import Link from 'next/link';

const PLANS = [
  { name: 'Free',       price: '$0',   features: ['1 branch', '5 users',  'Community support'] },
  { name: 'Starter',    price: '$29',  features: ['3 branches', '25 users', 'Email support', 'Branded subdomain'] },
  { name: 'Growth',     price: '$99',  features: ['10 branches', '100 users', 'Priority support', 'Custom domain', 'SSO'] },
  { name: 'Enterprise', price: '$499', features: ['Unlimited', 'Unlimited users', '24/7 support', 'SLA', 'White-label'] },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="mt-3 text-lg text-gray-600">Start free. Scale as you grow.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((p) => (
            <div key={p.name} className="bg-white rounded-xl shadow p-6 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
              <div className="mt-2 text-3xl font-extrabold text-gray-900">{p.price}<span className="text-sm text-gray-500">/mo</span></div>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
                {p.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <Link href="/signup/create" className="mt-6 block text-center px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800">
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
