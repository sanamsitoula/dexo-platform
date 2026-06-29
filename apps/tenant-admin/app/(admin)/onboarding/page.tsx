'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function OnboardingPage() {
  const [tenantId, setTenantId] = useState('');
  const [data, setData] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    if (user?.tenantId) {
      setTenantId(user.tenantId);
      load(user.tenantId);
    }
  }, []);

  async function load(tid: string) {
    const res = await fetch(`${API_URL}/api/onboarding/tenant?tenantId=${tid}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setStep(d.step || 1);
    }
  }

  async function save(n: number, payload: any) {
    setMsg(null);
    const res = await fetch(`${API_URL}/api/onboarding/tenant/step/${n}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify({ tenantId, data: payload }),
    });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setStep(n + 1);
      setMsg(`Step ${n} saved.`);
    } else {
      setMsg('Save failed');
    }
  }

  async function complete() {
    const res = await fetch(`${API_URL}/api/onboarding/tenant/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify({ tenantId }),
    });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setMsg('🎉 Onboarding complete!');
    }
  }

  if (!data) return <div className="text-gray-500">Loading onboarding state...</div>;

  const flags = [
    { k: 'profileComplete',  label: 'Profile' },
    { k: 'brandingComplete', label: 'Branding' },
    { k: 'modulesComplete',  label: 'Modules' },
    { k: 'teamComplete',     label: 'Team' },
    { k: 'websiteComplete',  label: 'Website' },
    { k: 'billingComplete',  label: 'Billing' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Tenant Onboarding</h2>
      <p className="mt-1 text-gray-500">Step {data.step} of {data.totalSteps}</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {flags.map((f) => (
          <div key={f.k} className={`px-3 py-2 rounded-md text-sm ${data[f.k] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
            {data[f.k] ? '✓' : '○'} {f.label}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        {step === 1 && (
          <div>
            <h3 className="font-semibold">Step 1: Profile</h3>
            <button onClick={() => save(1, { name: 'Test' })} className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-md">Save & Continue</button>
          </div>
        )}
        {step === 2 && (
          <div>
            <h3 className="font-semibold">Step 2: Services</h3>
            <button onClick={() => save(2, { services: ['memberships'] })} className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-md">Save & Continue</button>
          </div>
        )}
        {step > 2 && step < 6 && (
          <div>
            <h3 className="font-semibold">Step {step}</h3>
            <button onClick={() => save(step, {}) } className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-md">Save & Continue</button>
          </div>
        )}
        {step >= 6 && !data.completed && (
          <div>
            <h3 className="font-semibold">Finalize</h3>
            <button onClick={complete} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-md">Complete Onboarding</button>
          </div>
        )}
        {data.completed && (
          <div className="text-emerald-600 font-semibold">🎉 Onboarding complete!</div>
        )}
        {msg && <div className="mt-3 text-sm text-gray-600">{msg}</div>}
      </div>
    </div>
  );
}
