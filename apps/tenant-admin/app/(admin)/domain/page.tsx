'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

interface Lifecycle {
  subdomainSlug: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  dnsToken: string | null;
  sslStatus: string;
  status: string;
}

export default function DomainPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string>('');
  const [lc, setLc] = useState<Lifecycle | null>(null);
  const [domain, setDomain] = useState('');
  const [dnsInstructions, setDnsInstructions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    if (user?.tenantId) {
      setTenantId(user.tenantId);
      loadLifecycle(user.tenantId);
    } else {
      // Try fetching from a default tenant for demo
      setMsg('Sign in first to manage your custom domain.');
    }
  }, []);

  async function loadLifecycle(tid: string) {
    try {
      const res = await fetch(`${API_URL}/api/tenants/${tid}/domain/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (res.ok) setLc(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  async function requestDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !domain) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/domain/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      setDnsInstructions(data);
      setMsg('DNS record generated. Add it to your DNS provider, then click Verify.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!tenantId) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/domain/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await res.json();
      if (data.verified) {
        setMsg('✅ Domain verified! SSL provisioning started.');
        loadLifecycle(tenantId);
      } else {
        setMsg(`❌ Not verified: ${data.reason || 'check DNS and try again'}`);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Custom Domain</h2>
      <p className="mt-1 text-gray-500">Connect your own domain (e.g. fitness.example.com) to your tenant.</p>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900">Current Subdomain</h3>
        <div className="mt-2 text-lg font-mono text-slate-700">
          {lc?.subdomainSlug || '(unknown)'}.{PLATFORM_DOMAIN}
        </div>
        <div className="mt-1 text-xs text-gray-500">Read-only — provisioned at signup</div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900">Custom Domain</h3>
        <form onSubmit={requestDomain} className="mt-3 flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="fitness.example.com"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? '...' : 'Request'}
          </button>
        </form>

        {dnsInstructions && (
          <div className="mt-4 bg-slate-50 rounded-md p-4">
            <h4 className="font-semibold text-gray-900">DNS Instructions</h4>
            <div className="mt-2 text-sm font-mono">
              <div>Type: {dnsInstructions.type}</div>
              <div>Host: {dnsInstructions.host}</div>
              <div>Value: {dnsInstructions.value}</div>
            </div>
            <p className="mt-2 text-xs text-gray-600">{dnsInstructions.instructions}</p>
            <button
              onClick={verify}
              disabled={loading}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              Verify Now
            </button>
          </div>
        )}

        {msg && <div className="mt-3 text-sm text-gray-700">{msg}</div>}

        {lc?.customDomain && (
          <div className="mt-4 border-t pt-4">
            <div className="text-sm">
              <strong>Status:</strong>{' '}
              {lc.customDomainVerified ? (
                <span className="text-emerald-600">Verified</span>
              ) : (
                <span className="text-yellow-600">Pending verification</span>
              )}{' '}
              | SSL: <span className="font-mono">{lc.sslStatus}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
