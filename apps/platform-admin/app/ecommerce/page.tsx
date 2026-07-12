'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ecommerceAdminApi } from '@/lib/api';

interface PerTenantRow {
  tenantId: string;
  tenantName: string;
  productCount: number;
  orderCount: number;
  revenue: number;
}

interface Summary {
  totalStores: number;
  tenantsWithEcommerceEnabled: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  perTenant: PerTenantRow[];
}

function formatCurrency(n: number) {
  return `NPR ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EcommerceOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    ecommerceAdminApi
      .getSummary()
      .then((res) => {
        if (res.data) setSummary(res.data);
        else setError(res.error || 'Failed to load summary');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Ecommerce</h1>
      <p className="mt-1 text-gray-500">Cross-tenant storefront visibility — products, orders and revenue across every tenant.</p>

      {loading && <div className="mt-6 text-gray-500">Loading...</div>}
      {error && <div className="mt-6 text-red-600 text-sm">{error}</div>}

      {summary && (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm font-medium text-gray-500">Tenants with Ecommerce</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {summary.tenantsWithEcommerceEnabled}
                <span className="text-sm font-normal text-gray-400"> / {summary.totalStores}</span>
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.totalProducts.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.totalOrders.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
            </div>
          </div>

          <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Per-tenant breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {summary.perTenant.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      No tenants have products or orders yet.
                    </td>
                  </tr>
                )}
                {summary.perTenant.map((t) => (
                  <tr key={t.tenantId} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{t.tenantName}</td>
                    <td className="px-4 py-3">{t.productCount}</td>
                    <td className="px-4 py-3">{t.orderCount}</td>
                    <td className="px-4 py-3">{formatCurrency(t.revenue)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/tenants/${t.tenantId}/ecommerce`} className="text-blue-600 hover:underline text-xs">
                        View details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
