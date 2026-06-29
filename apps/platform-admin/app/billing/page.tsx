'use client'

import { useEffect, useState } from 'react'
import { billingApi } from '@/lib/api'

export default function BillingPage() {
  const [summary, setSummary] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [sumRes, invRes] = await Promise.all([billingApi.getSummary(), billingApi.getInvoices()])
    if (sumRes.data) setSummary(sumRes.data)
    if (invRes.data) setInvoices(Array.isArray(invRes.data) ? invRes.data : [])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading billing...</div></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <p className="mt-2 text-gray-600">Manage billing and invoices</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-green-600">${((summary.totalRevenue || 0) / 100).toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Outstanding</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">${((summary.outstanding || 0) / 100).toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Overdue</p>
            <p className="mt-2 text-3xl font-bold text-red-600">${((summary.overdue || 0) / 100).toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Invoices</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No invoices found.</td></tr>
            ) : invoices.map((inv: any) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.id?.slice(0, 8) || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">${((inv.amount || 0) / 100).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {inv.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
