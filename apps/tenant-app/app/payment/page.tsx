'use client';

import { useEffect, useState } from 'react';
import { paymentApi } from '../../lib/api';

interface Transaction {
  id: string;
  internalOrderId: string;
  amount: string | number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  description: string | null;
  createdAt: string;
  provider?: { name: string; type: string };
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'text-emerald-600 bg-emerald-50',
  COMPLETED: 'text-emerald-600 bg-emerald-50',
  PENDING: 'text-amber-600 bg-amber-50',
  INITIATED: 'text-amber-600 bg-amber-50',
  FAILED: 'text-red-600 bg-red-50',
  REFUNDED: 'text-gray-600 bg-gray-100',
};

/** Payment history — generic across every business vertical (not
 * fitness-only like most of this app), since it reads from PaymentTransaction
 * rather than a vertical-specific model. */
export default function PaymentPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentApi.myTransactions().then((r) => {
      if (r.error) setError(r.error);
      else setTransactions(Array.isArray(r.data) ? r.data : []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900">Payments</h1>
      <p className="text-sm text-gray-500 mt-1">Your payment history for this business.</p>

      {loading ? (
        <div className="mt-6 text-gray-400 text-sm">Loading…</div>
      ) : error ? (
        <div className="mt-6 text-sm text-red-600">Failed to load: {error}</div>
      ) : transactions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 p-6 text-center">
          <div className="text-3xl">🧾</div>
          <div className="mt-2 font-semibold text-gray-900">No payments yet</div>
          <p className="mt-1 text-sm text-gray-500">Your payment history will show up here once you make a purchase.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">
                    {t.currency} {Number(t.amount).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.description || t.internalOrderId}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[t.status] || 'text-gray-600 bg-gray-100'}`}>
                  {t.status}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                <span>{new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {t.paymentMethod && <span>· {t.paymentMethod}</span>}
                {t.provider?.name && <span>· {t.provider.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
