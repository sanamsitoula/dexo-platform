'use client';

import { useEffect, useState } from 'react';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');

interface ErrorLogEntry {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  errorName: string | null;
  stack: string | null;
  tenantId: string | null;
  tenantName: string | null;
  businessType: string | null;
  userId: string | null;
  createdAt: string;
}

function humanizeBusinessType(code?: string | null): string | null {
  if (!code) return null;
  return code.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/** Every unhandled 5xx the API's CentralErrorFilter has caught, regardless
 * of how the API process was started — this is what makes a crash visible
 * even when nobody was watching a terminal live when it happened. */
export default function ErrorLogsPanel() {
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ErrorLogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_HOST}/api/error-logs?limit=100`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => setErrors(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Application Errors</h2>
      <p className="mt-1 text-gray-600 text-sm">
        Every unhandled 5xx caught by the API, persisted regardless of how the API process was started.
      </p>

      {loading ? (
        <div className="mt-4 text-gray-400">Loading…</div>
      ) : error ? (
        <div className="mt-4 text-sm text-red-600">Failed to load: {error}</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Recent Errors ({errors.length})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {errors.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No errors logged. 🎉</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {errors.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelected(e)}
                        className={`w-full text-left block px-4 py-3 hover:bg-gray-50 ${selected?.id === e.id ? 'bg-red-50 border-l-4 border-red-600' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-red-700">{e.statusCode} {e.method}</span>
                          <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-700 mt-1 font-mono truncate">{e.path}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{e.message}</div>
                        {e.tenantName && (
                          <div className="text-xs text-indigo-600 mt-0.5 truncate">
                            {e.tenantName}{e.businessType ? ` · ${humanizeBusinessType(e.businessType)}` : ''}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-gray-900 rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">
                {selected ? `${selected.errorName || 'Error'} — ${selected.path}` : 'Select an error'}
              </h3>
            </div>
            <div className="p-4 overflow-auto max-h-[500px]">
              {selected ? (
                <div className="space-y-2 text-xs text-gray-200 font-mono">
                  <div><span className="text-gray-500">Method/Path:</span> {selected.method} {selected.path}</div>
                  <div><span className="text-gray-500">Status:</span> {selected.statusCode}</div>
                  <div><span className="text-gray-500">Message:</span> {selected.message}</div>
                  {selected.tenantName && (
                    <div>
                      <span className="text-gray-500">Tenant:</span> {selected.tenantName}
                      {selected.businessType ? ` (${humanizeBusinessType(selected.businessType)})` : ''}
                      {' '}<span className="text-gray-600">[{selected.tenantId}]</span>
                    </div>
                  )}
                  {!selected.tenantName && selected.tenantId && (
                    <div><span className="text-gray-500">Tenant:</span> {selected.tenantId}</div>
                  )}
                  {selected.userId && <div><span className="text-gray-500">User:</span> {selected.userId}</div>}
                  <div><span className="text-gray-500">Time:</span> {new Date(selected.createdAt).toLocaleString()}</div>
                  {selected.stack && (
                    <pre className="mt-3 whitespace-pre-wrap break-all text-gray-300">{selected.stack}</pre>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Click an error on the left to view details.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
