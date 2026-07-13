'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ecommerceApi, paymentGatewayApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function OnboardingPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [tenantId, setTenantId] = useState('');
  const [data, setData] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  // --- Step 3: Store setup ---
  const [storeName, setStoreName] = useState('');
  const [storeCurrency, setStoreCurrency] = useState('NPR');
  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [savingCategory, setSavingCategory] = useState(false);

  // --- Step 4: First product ---
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // --- Step 5: Payment ---
  const [providers, setProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    if (user?.tenantId) {
      setTenantId(user.tenantId);
      load(user.tenantId);
    }
    // Load existing categories so step 3/4 can skip forward if already set up.
    ecommerceApi.categories.list(subdomain).then((r) => {
      if (r.data) setCategories(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 5) refreshProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function refreshProviders() {
    setLoadingProviders(true);
    const r = await paymentGatewayApi.listTenantProviders(subdomain);
    if (r.data) setProviders(r.data);
    setLoadingProviders(false);
  }

  async function createCategory() {
    if (!categoryName.trim()) return;
    setSavingCategory(true);
    const r = await ecommerceApi.categories.create(subdomain, { name: categoryName.trim() });
    if (r.error) alert(r.error);
    else if (r.data) setCategories((c) => [...c, r.data]);
    setSavingCategory(false);
    setCategoryName('');
  }

  async function createProduct() {
    if (!productName.trim() || !productPrice) return;
    setSavingProduct(true);
    const r = await ecommerceApi.products.create(subdomain, {
      name: productName.trim(),
      sellingPrice: Number(productPrice),
      categoryId: productCategoryId || undefined,
    });
    if (r.error) alert(r.error);
    setSavingProduct(false);
    if (!r.error) {
      setProductName('');
      setProductPrice('');
    }
    return !r.error;
  }

  async function load(tid: string) {
    const res = await fetch(`${API_URL}/api/onboarding/tenant?tenantId=${tid}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setStep(d.step || 1);
    }
  }

  async function save(n: number, payload: any) {
    setMsg(null);
    const res = await fetch(`${API_URL}/api/onboarding/tenant/step/${n}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify({ tenantId, data: payload }),
    });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setStep(n + 1);
      setMsg(`Step ${n} saved.`);
    } else {
      setMsg('Save failed');
    }
  }

  async function complete() {
    const res = await fetch(`${API_URL}/api/onboarding/tenant/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify({ tenantId }),
    });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setMsg('🎉 Onboarding complete!');
    }
  }

  if (!data) return <div className="text-gray-500">Loading onboarding state...</div>;

  const flags = [
    { k: 'profileComplete',  label: 'Profile' },
    { k: 'brandingComplete', label: 'Branding' },
    { k: 'modulesComplete',  label: 'Modules' },
    { k: 'teamComplete',     label: 'Team' },
    { k: 'websiteComplete',  label: 'Website' },
    { k: 'billingComplete',  label: 'Billing' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Tenant Onboarding</h2>
      <p className="mt-1 text-gray-500">Step {data.step} of {data.totalSteps}</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {flags.map((f) => (
          <div key={f.k} className={`px-3 py-2 rounded-md text-sm ${data[f.k] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
            {data[f.k] ? '✓' : '○'} {f.label}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        {step === 1 && (
          <div>
            <h3 className="font-semibold">Step 1: Profile</h3>
            <button onClick={() => save(1, { name: 'Test' })} className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-md">Save & Continue</button>
          </div>
        )}
        {step === 2 && (
          <div>
            <h3 className="font-semibold">Step 2: Services</h3>
            <button onClick={() => save(2, { services: ['memberships'] })} className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-md">Save & Continue</button>
          </div>
        )}
        {step === 3 && (
          <div>
            <h3 className="font-semibold">Step 3: Store setup</h3>
            <p className="text-sm text-gray-500 mt-1">Confirm your store basics and create your first product category.</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">Store name</span>
                <input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="My Store"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</span>
                <select
                  value={storeCurrency}
                  onChange={(e) => setStoreCurrency(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="NPR">NPR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <div className="mt-4">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">First product category</span>
              {categories.length > 0 ? (
                <div className="text-sm text-gray-600 mb-2">
                  Already have {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}: {categories.map((c) => c.name).join(', ')}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={createCategory}
                    disabled={savingCategory || !categoryName.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold disabled:opacity-50"
                  >
                    {savingCategory ? 'Adding…' : 'Add'}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => save(3, { storeName, storeCurrency, categoryCount: categories.length })}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-md"
            >
              Save & Continue
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="font-semibold">Step 4: Add your first product</h3>
            <p className="text-sm text-gray-500 mt-1">Optional — you can always add products later from the Products page.</p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <label className="block col-span-1">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">Name</span>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Product name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block col-span-1">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">Selling price</span>
                <input
                  type="number"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block col-span-1">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">Category</span>
                <select
                  value={productCategoryId}
                  onChange={(e) => setProductCategoryId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  const ok = await createProduct();
                  if (ok) save(4, { addedFirstProduct: true });
                }}
                disabled={savingProduct || !productName.trim() || !productPrice}
                className="px-4 py-2 bg-slate-900 text-white rounded-md disabled:opacity-50"
              >
                {savingProduct ? 'Saving…' : 'Save Product & Continue'}
              </button>
              <button onClick={() => save(4, { skipped: true })} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="font-semibold">Step 5: Connect payment</h3>
            <p className="text-sm text-gray-500 mt-1">
              Connect a payment gateway (eSewa, Fonepay, ConnectIPS, Stripe, or PayPal) so customers can pay for orders online.
              You can configure this now or anytime later from Settings → Payments.
            </p>

            {loadingProviders ? (
              <div className="text-sm text-gray-400 mt-3">Checking configured providers…</div>
            ) : providers.some((p) => p.hasCredentials) ? (
              <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                ✓ At least one payment provider is already configured.
              </div>
            ) : (
              <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                No payment provider configured yet.
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Link href="/settings/payments" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold">
                Go to Payment Settings
              </Link>
              <button onClick={() => { refreshProviders(); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">
                Refresh status
              </button>
            </div>

            <button
              onClick={() => save(5, { hasPaymentProvider: providers.some((p) => p.hasCredentials) })}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-md block"
            >
              Save & Continue
            </button>
          </div>
        )}
        {step >= 6 && !data.completed && (
          <div>
            <h3 className="font-semibold">Finalize</h3>
            <button onClick={complete} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-md">Complete Onboarding</button>
          </div>
        )}
        {data.completed && (
          <div className="text-emerald-600 font-semibold">🎉 Onboarding complete!</div>
        )}
        {msg && <div className="mt-3 text-sm text-gray-600">{msg}</div>}
      </div>
    </div>
  );
}
