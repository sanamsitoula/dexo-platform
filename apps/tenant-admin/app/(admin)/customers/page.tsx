'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ecommerceApi } from '@/lib/api';
import { PageHeader, Card, EmptyState } from '../_ui';

export default function CustomersPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [customers, setCustomers] = useState<Array<{
    id: string; name: string; email: string | null; mobile: string | null;
    totalSpent: number; orderCount: number; lastOrderAt: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function fetchCustomers() {
    setLoading(true);
    const r = await ecommerceApi.customers.list(subdomain);
    if (r.data) {
      setCustomers(Array.isArray(r.data) ? r.data : []);
      setError(null);
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle="Lifetime spend and order history per customer" />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : customers.length === 0 ? (
          <EmptyState icon="👤" title="No customers yet" msg="Customers who register or check out on your storefront will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold">Orders</th>
                  <th className="text-left px-4 py-3 font-semibold">Total Spent</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || c.mobile || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.orderCount}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">${c.totalSpent.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
