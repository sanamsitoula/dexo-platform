'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ecommerceAdminApi, tenantsApi } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  isActive: boolean;
  stockItems?: { quantityOnHand: number }[];
  variants?: any[];
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  currency: string;
  placedAt: string;
  customer?: { name?: string; email?: string } | null;
}

interface Dashboard {
  productCount: number;
  lowStockCount: number;
  orderCount: number;
  pendingOrders: number;
  totalRevenue: number;
}

function formatCurrency(n: number, currency = 'NPR') {
  return `${currency} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantEcommercePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      tenantsApi.getById(id),
      ecommerceAdminApi.getTenantDashboard(id),
      ecommerceAdminApi.getTenantProducts(id),
      ecommerceAdminApi.getTenantOrders(id),
    ])
      .then(([tRes, dRes, pRes, oRes]) => {
        if (tRes.data) setTenant(tRes.data);
        if (dRes.data) setDashboard(dRes.data);
        if (pRes.data) setProducts(pRes.data);
        if (oRes.data) setOrders(oRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <button onClick={() => router.push('/ecommerce')} className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to Ecommerce overview
      </button>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{tenant?.name || 'Tenant'} — Ecommerce</h1>
      <p className="text-sm text-gray-500">ID: {id}</p>

      {dashboard && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-500">Products</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{dashboard.productCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-500">Low Stock</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{dashboard.lowStockCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-500">Orders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {dashboard.orderCount}
              <span className="text-sm font-normal text-gray-400"> ({dashboard.pendingOrders} pending)</span>
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-500">Revenue</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(dashboard.totalRevenue)}</p>
          </div>
        </div>
      )}

      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setTab('products')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tab === 'products' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Orders ({orders.length})
          </button>
        </nav>
      </div>

      {tab === 'products' && (
        <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No products.</td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">{formatCurrency(p.sellingPrice)}</td>
                  <td className="px-4 py-3">{(p.stockItems || []).reduce((s, si) => s + (si.quantityOnHand || 0), 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No orders.</td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customer?.name || o.customer?.email || '—'}</td>
                  <td className="px-4 py-3">{formatCurrency(o.grandTotal, o.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.placedAt ? new Date(o.placedAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
