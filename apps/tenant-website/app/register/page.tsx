'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`${API_URL}/api/onboarding/customer/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'current-tenant', email, source: 'tenant_website' }),
    });
    if (!res.ok) { setError('Failed to start onboarding'); return; }
    const d = await res.json();
    setData(d);
    setStep(2);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-8">
        {step === 1 ? (
          <form onSubmit={start} className="space-y-4">
            <h1 className="text-2xl font-bold text-center">Create your account</h1>
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              required
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              required
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button type="submit" className="w-full bg-slate-900 text-white rounded-md py-2">Continue</button>
          </form>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-bold">Welcome, {firstName}!</h2>
            <p className="mt-2 text-gray-600">Your account has been created. Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
}
