import { headers } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function resolveDomainCode(slug: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/tenants/subdomain/${slug}`, { cache: 'no-store' });
    if (res.ok) {
      const tenant = await res.json();
      const settings = (tenant?.settings as Record<string, any>) || {};
      return tenant?.domainCode || settings.domainCode || 'FITNESS_CENTER';
    }
  } catch {}
  return 'FITNESS_CENTER';
}

async function EcommerceDashboard({ slug }: { slug: string }) {
  let stats: any = { productCount: 0, orderCount: 0, pendingOrders: 0, lowStockCount: 0, totalRevenue: 0 };
  let recentOrders: any[] = [];

  try {
    const [summary, orders] = await Promise.all([
      fetch(`${API_URL}/api/ecommerce/dashboard/summary?tenantId=${slug}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/ecommerce/orders?tenantId=${slug}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
    ]);
    stats = { ...stats, ...summary };
    recentOrders = (Array.isArray(orders) ? orders : orders?.data || []).slice(0, 8);
  } catch {}

  const cards = [
    { label: 'Products', value: stats.productCount },
    { label: 'Orders (total)', value: stats.orderCount },
    { label: 'Pending Orders', value: stats.pendingOrders },
    { label: 'Low Stock Items', value: stats.lowStockCount },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
      <p className="mt-1 text-gray-500">Here&rsquo;s what&rsquo;s happening with {slug} today.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg shadow p-5">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900">Revenue</h3>
          <div className="mt-4 text-4xl font-bold text-emerald-600">
            Rs {Number(stats.totalRevenue || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-sm text-gray-500">across all non-cancelled orders</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900">Quick Links</h3>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <a href="/products" className="text-blue-600 hover:underline">Products</a>
            <a href="/orders" className="text-blue-600 hover:underline">Orders</a>
            <a href="/inventory" className="text-blue-600 hover:underline">Inventory</a>
            <a href="/finance" className="text-blue-600 hover:underline">Finance</a>
            <a href="/website" className="text-blue-600 hover:underline">Website Builder</a>
            <a href="/settings" className="text-blue-600 hover:underline">Settings</a>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900">Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No orders yet.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Order</th>
                <th className="py-2">Status</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o: any) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2">{o.orderNumber || o.id}</td>
                  <td className="py-2">{o.status}</td>
                  <td className="py-2">Rs {Number(o.grandTotal || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

async function FitnessDashboard({ slug }: { slug: string }) {
  let stats: any = { members: 0, classes: 4, revenue: 0, branches: 0, pendingInvoices: 0 };

  try {
    const [members, invoices, branches] = await Promise.all([
      fetch(`${API_URL}/api/fitness/members?tenantId=${slug}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/finance/invoices?tenantId=${slug}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/branches?tenantId=${slug}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    stats.members = members?.data?.length || members?.length || 0;
    stats.branches = branches?.data?.length || branches?.length || 0;
    const invList = invoices?.data || invoices || [];
    stats.revenue = invList.reduce((s: number, i: any) => s + (i.totalAmount || i.total || 0), 0);
    stats.pendingInvoices = invList.filter((i: any) => i.paymentStatus !== 'PAID').length;
  } catch {}

  const cards = [
    { label: 'Active Members', value: stats.members },
    { label: 'Branches',       value: stats.branches },
    { label: 'Today\u2019s Classes', value: stats.classes },
    { label: 'Pending Invoices', value: stats.pendingInvoices },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
      <p className="mt-1 text-gray-500">Here\u2019s what\u2019s happening with {slug} today.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg shadow p-5">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900">Revenue (last 30d)</h3>
          <div className="mt-4 text-4xl font-bold text-emerald-600">
            ${Number(stats.revenue).toLocaleString()}
          </div>
          <div className="mt-1 text-sm text-gray-500">across all branches</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900">Quick Links</h3>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <a href="/users" className="text-blue-600 hover:underline">Manage Users</a>
            <a href="/branches" className="text-blue-600 hover:underline">Branches</a>
            <a href="/finance" className="text-blue-600 hover:underline">Finance</a>
            <a href="/domain" className="text-blue-600 hover:underline">Custom Domain</a>
            <a href="/website" className="text-blue-600 hover:underline">Website Builder</a>
            <a href="/onboarding" className="text-blue-600 hover:underline">Onboarding</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const h = headers();
  const slug = h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';
  const domainCode = await resolveDomainCode(slug);

  if (domainCode === 'ECOMMERCE') return <EcommerceDashboard slug={slug} />;
  return <FitnessDashboard slug={slug} />;
}
