'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ecommerceApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, EmptyState, Badge } from '../_ui';

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'gray' | 'red' | 'indigo'> = {
  PENDING: 'amber',
  CONFIRMED: 'indigo',
  PROCESSING: 'indigo',
  PACKED: 'indigo',
  SHIPPED: 'indigo',
  DELIVERED: 'green',
  CANCELLED: 'red',
  RETURNED: 'red',
  REFUNDED: 'gray',
};

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'];

export default function OrdersPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function fetchOrders() {
    setLoading(true);
    const r = await ecommerceApi.orders.list(subdomain, false);
    if (r.data) {
      setOrders(Array.isArray(r.data) ? r.data : []);
      setError(null);
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  const filtered = status ? orders.filter((o) => o.status === status) : orders;

  return (
    <div>
      <PageHeader title="Orders" subtitle="Track and manage customer orders" />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🧾" title="No orders yet" msg="Orders placed on your storefront will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Order #</th>
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold">Total</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Placed</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{order.customer?.name || order.customerId || 'Guest'}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {order.grandTotal != null ? `$${Number(order.grandTotal).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[order.status] || 'gray'}>{order.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(order.placedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold">View</Link>
                    </td>
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
