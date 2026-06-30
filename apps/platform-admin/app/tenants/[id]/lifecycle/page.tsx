'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function TenantLifecyclePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [tenant, setTenant] = useState<any>(null);
  const [lc, setLc] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [tRes, lRes] = await Promise.all([
      fetch(`${API_URL}/api/tenants/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/tenants/${id}/lifecycle`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } }).then((r) => r.json()),
    ]);
    setTenant(tRes);
    setLc(lRes);
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function action(path: string, body: any, label: string) {
    if (!confirm(`${label}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/tenants/${id}/lifecycle/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `${label} failed`);
      }
      setMsg(`✅ ${label} succeeded`);
      await load();
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!lc) return <div className="p-6 text-gray-500">Loading lifecycle...</div>;

  const status = lc.status || 'ACTIVE';
  const isSuspended = status === 'SUSPENDED';
  const isActive = status === 'ACTIVE';
  const isArchived = status === 'ARCHIVED';
  const isScheduled = status === 'DELETION_SCHEDULED';

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{tenant?.name || 'Tenant'}</h1>
      <p className="text-sm text-gray-500">ID: {id}</p>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold">Lifecycle Status</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><strong>Status:</strong> <span className={`ml-1 px-2 py-0.5 rounded text-xs ${isActive ? 'bg-emerald-100 text-emerald-700' : isSuspended ? 'bg-yellow-100 text-yellow-700' : isArchived ? 'bg-gray-200 text-gray-600' : isScheduled ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{status}</span></div>
          <div><strong>Subdomain:</strong> <code className="ml-1 text-xs bg-gray-100 px-1 py-0.5 rounded">{lc.subdomainSlug}</code></div>
          <div><strong>SSL:</strong> {lc.sslStatus}</div>
          <div><strong>Custom Domain:</strong> {lc.customDomain || '—'}</div>
          {lc.suspendedAt && <div><strong>Suspended:</strong> {new Date(lc.suspendedAt).toLocaleString()}</div>}
          {lc.deletionScheduledAt && <div><strong>Deletion:</strong> {new Date(lc.deletionScheduledAt).toLocaleString()}</div>}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold">Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => action('suspend', { reason: prompt('Reason?') || 'unspecified', suspendedBy: 'admin' }, 'Suspend')}
            disabled={busy || !isActive}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm disabled:opacity-50"
          >
            Suspend
          </button>
          <button
            onClick={() => action('reactivate', { reactivatedBy: 'admin' }, 'Reactivate')}
            disabled={busy || !isSuspended}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm disabled:opacity-50"
          >
            Reactivate
          </button>
          <button
            onClick={() => action('archive', { archivedBy: 'admin' }, 'Archive')}
            disabled={busy || !isSuspended}
            className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm disabled:opacity-50"
          >
            Archive
          </button>
          <button
            onClick={() => action('delete', { requestedBy: 'admin' }, 'Schedule Deletion (30d)')}
            disabled={busy || isArchived || isScheduled}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
          >
            Schedule Deletion
          </button>
          {isScheduled && (
            <button
              onClick={() => action('cancel-delete', {}, 'Cancel Deletion')}
              disabled={busy}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm"
            >
              Cancel Deletion
            </button>
          )}
        </div>
        {msg && <div className="mt-3 text-sm">{msg}</div>}
        {lc.suspendReason && (
          <div className="mt-3 text-xs text-gray-500">
            <strong>Suspend reason (admin only):</strong> {lc.suspendReason}
          </div>
        )}
      </div>
    </div>
  );
}
