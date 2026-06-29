'use client'

import { useEffect, useState } from 'react'
import { subscriptionsApi } from '@/lib/api'

interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEnd: string | null
  plan?: { name: string; priceCents: number }
  tenant?: { name: string }
}

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  priceCents: number
  pricePerCustomerCents: number
  currency: string
  billingInterval: string
  maxCustomers: number
  maxUsers: number
  maxBranches: number
  features: Record<string, any>
  limits: Record<string, any>
  isActive: boolean
  isFeatured: boolean
  trialDays: number
}

const DEFAULT_PLANS: Omit<Plan, 'id'>[] = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Perfect for trying Dexo. Free for 1 month, up to 5 customers per tenant.',
    priceCents: 0,
    pricePerCustomerCents: 0,
    currency: 'USD',
    billingInterval: 'monthly',
    maxCustomers: 5,
    maxUsers: 2,
    maxBranches: 1,
    features: {
      coreModules: true,
      basicReports: true,
      emailSupport: true,
      customBranding: false,
      whiteLabel: false,
      advancedReports: false,
      prioritySupport: false,
      apiAccess: false,
    },
    limits: { customers: 5, users: 2, branches: 1, storage: 1 },
    isActive: true,
    isFeatured: false,
    trialDays: 30,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For growing businesses. $9.99/month per tenant with unlimited customers.',
    priceCents: 999,
    pricePerCustomerCents: 0,
    currency: 'USD',
    billingInterval: 'monthly',
    maxCustomers: 9999,
    maxUsers: 50,
    maxBranches: 10,
    features: {
      coreModules: true,
      basicReports: true,
      emailSupport: true,
      customBranding: true,
      whiteLabel: false,
      advancedReports: true,
      prioritySupport: true,
      apiAccess: true,
    },
    limits: { customers: 9999, users: 50, branches: 10, storage: 50 },
    isActive: true,
    isFeatured: true,
    trialDays: 30,
  },
  {
    name: 'Whitelabel',
    slug: 'whitelabel',
    description: 'Run Dexo under your own brand. $1 per customer/month + base subscription.',
    priceCents: 0,
    pricePerCustomerCents: 100,
    currency: 'USD',
    billingInterval: 'monthly',
    maxCustomers: 99999,
    maxUsers: 9999,
    maxBranches: 9999,
    features: {
      coreModules: true,
      basicReports: true,
      emailSupport: true,
      customBranding: true,
      whiteLabel: true,
      advancedReports: true,
      prioritySupport: true,
      apiAccess: true,
      customDomain: true,
      removeDexoBranding: true,
    },
    limits: { customers: 99999, users: 9999, branches: 9999, storage: 500 },
    isActive: true,
    isFeatured: false,
    trialDays: 30,
  },
]

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [tenants, setTenants] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [subRes, planRes, tenantsRes] = await Promise.all([
      subscriptionsApi.list(),
      subscriptionsApi.listPlans(),
      fetch('http://localhost:4000/api/tenants?limit=100', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      }).then((r) => r.json()).catch(() => ({ data: [] })),
    ])
    if (subRes.data) setSubscriptions(Array.isArray(subRes.data) ? subRes.data : [])
    if (planRes.data) {
      const list = Array.isArray(planRes.data) ? planRes.data : []
      setPlans(list)
    }
    if (tenantsRes.data) setTenants(tenantsRes.data)
    setLoading(false)
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this subscription?')) return
    await subscriptionsApi.cancel(id)
    fetchData()
  }

  async function handleAssignPlan(tenantId: string, planId: string) {
    const res = await subscriptionsApi.changePlan(planId, tenantId)
    if (res.error) {
      alert(res.error)
    } else {
      fetchData()
    }
  }

  async function handleSavePlan() {
    if (!editingPlan) return
    const res = await subscriptionsApi.createPlan(editingPlan)
    if (res.error) {
      alert(res.error)
    } else {
      setShowPlanModal(false)
      setEditingPlan(null)
      fetchData()
    }
  }

  function startEditPlan(plan: Plan) {
    setEditingPlan({ ...plan })
    setShowPlanModal(true)
  }

  function startNewPlan() {
    setEditingPlan({
      id: '',
      name: '',
      slug: '',
      description: '',
      priceCents: 0,
      pricePerCustomerCents: 0,
      currency: 'USD',
      billingInterval: 'monthly',
      maxCustomers: 5,
      maxUsers: 2,
      maxBranches: 1,
      features: {},
      limits: {},
      isActive: true,
      isFeatured: false,
      trialDays: 30,
    })
    setShowPlanModal(true)
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      past_due: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
      unpaid: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading subscriptions…</div>
      </div>
    )
  }

  // Use seeded plans if API returns empty
  const displayPlans = plans.length > 0 ? plans : DEFAULT_PLANS.map((p, i) => ({ ...p, id: `default-${i}` })) as Plan[]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions & Plans</h1>
          <p className="mt-2 text-gray-600">Manage subscription plans and tenant subscriptions</p>
        </div>
        <button
          onClick={startNewPlan}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
        >
          + New Plan
        </button>
      </div>

      {/* Plans Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPlans.map((plan) => {
            const isPerCustomer = plan.pricePerCustomerCents > 0
            const isFree = plan.priceCents === 0 && !isPerCustomer
            return (
              <div
                key={plan.id}
                className={`relative bg-white shadow rounded-lg p-6 border-2 ${
                  plan.isFeatured ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
                }`}
              >
                {plan.isFeatured && (
                  <span className="absolute -top-3 left-4 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                    POPULAR
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>

                <div className="mt-4">
                  {isFree ? (
                    <div>
                      <span className="text-4xl font-bold text-gray-900">Free</span>
                      <p className="text-sm text-gray-500 mt-1">for {plan.trialDays || 30} days</p>
                    </div>
                  ) : isPerCustomer ? (
                    <div>
                      <span className="text-4xl font-bold text-gray-900">{formatPrice(plan.pricePerCustomerCents)}</span>
                      <span className="text-gray-500">/customer/month</span>
                      <p className="text-xs text-gray-500 mt-1">+ base platform fee</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl font-bold text-gray-900">{formatPrice(plan.priceCents)}</span>
                      <span className="text-gray-500">/{plan.billingInterval || 'month'}</span>
                    </div>
                  )}
                </div>

                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Up to <strong>{plan.maxCustomers === 99999 || plan.maxCustomers === 9999 ? 'unlimited' : plan.maxCustomers}</strong> customers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span><strong>{plan.maxUsers === 9999 ? 'unlimited' : plan.maxUsers}</strong> staff users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span><strong>{plan.maxBranches === 9999 ? 'unlimited' : plan.maxBranches}</strong> branches</span>
                  </li>
                  {plan.features?.whiteLabel && (
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-500">★</span>
                      <span><strong>White-label</strong> branding</span>
                    </li>
                  )}
                  {plan.features?.customDomain && (
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-500">★</span>
                      <span>Custom domain</span>
                    </li>
                  )}
                  {plan.features?.advancedReports && (
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Advanced reports & analytics</span>
                    </li>
                  )}
                  {plan.features?.prioritySupport && (
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Priority support</span>
                    </li>
                  )}
                  {plan.features?.apiAccess && (
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>API access</span>
                    </li>
                  )}
                </ul>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => startEditPlan(plan)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    ✏️ Edit
                  </button>
                  {tenants.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignPlan(e.target.value, plan.id)
                          e.target.value = ''
                        }
                      }}
                      className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-md"
                    >
                      <option value="">+ Assign to tenant</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Subscriptions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period End</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No active subscriptions. Assign a plan to a tenant to get started.
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {sub.tenant?.name || sub.tenantId}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {sub.plan?.name || sub.planId}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                    {sub.status !== 'canceled' && (
                      <button
                        onClick={() => handleCancel(sub.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Plan Edit Modal */}
      {showPlanModal && editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPlan.id ? `Edit ${editingPlan.name} Plan` : 'New Plan'}
              </h2>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Free, Pro, Whitelabel…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={editingPlan.slug}
                    onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value.toLowerCase() })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="free, pro, whitelabel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Plan description shown to customers"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-indigo-900">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Base Price (cents)</label>
                    <input
                      type="number"
                      value={editingPlan.priceCents}
                      onChange={(e) => setEditingPlan({ ...editingPlan, priceCents: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">${(editingPlan.priceCents / 100).toFixed(2)}/month</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Per-Customer (cents)</label>
                    <input
                      type="number"
                      value={editingPlan.pricePerCustomerCents}
                      onChange={(e) => setEditingPlan({ ...editingPlan, pricePerCustomerCents: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingPlan.pricePerCustomerCents > 0 ? `$${(editingPlan.pricePerCustomerCents / 100).toFixed(2)}/customer` : 'No per-customer'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Trial Days</label>
                    <input
                      type="number"
                      value={editingPlan.trialDays}
                      onChange={(e) => setEditingPlan({ ...editingPlan, trialDays: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Free trial period</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 italic">
                  💡 For Whitelabel: set base price to 0 and per-customer price (e.g., 100 cents = $1/customer/month).
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Limits</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Customers</label>
                    <input
                      type="number"
                      value={editingPlan.maxCustomers}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxCustomers: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">9999 = unlimited</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Users</label>
                    <input
                      type="number"
                      value={editingPlan.maxUsers}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxUsers: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Branches</label>
                    <input
                      type="number"
                      value={editingPlan.maxBranches}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxBranches: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Features</h3>
                {['coreModules', 'basicReports', 'emailSupport', 'customBranding', 'whiteLabel', 'advancedReports', 'prioritySupport', 'apiAccess', 'customDomain', 'removeDexoBranding'].map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!editingPlan.features?.[f]}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, [f]: e.target.checked },
                      })}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <span className="capitalize">{f.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingPlan.isActive}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span>Active (available for purchase)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingPlan.isFeatured}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isFeatured: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span>Featured (highlighted as popular)</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={!editingPlan.name || !editingPlan.slug}
                className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                💾 Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
