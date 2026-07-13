'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { tenantInvoicesApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, EmptyState, ErrorState, LoadingState, formatNumber, formatDate, downloadCsv } from '@/lib/report-utils'

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  UNPAID: 'bg-red-50 text-red-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-gray-100 text-gray-500 line-through',
}

export default function InvoicesPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const load = () => {
    setLoading(true); setError(null)
    tenantInvoicesApi.list(subdomain, statusFilter ? { status: statusFilter } : undefined).then((r) => {
      if (r.error) setError(r.error); else setInvoices(r.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [subdomain, statusFilter])

  const totalAmt = invoices.reduce((s, i) => s + Number(i.totalAmount), 0)
  const paidAmt = invoices.reduce((s, i) => s + Number(i.paidAmount), 0)
  const outstanding = totalAmt - paidAmt

  return (
    <div>
      <ReportHeader
        title="Invoices & Bills"
        subtitle="Tax invoices (NPR, VAT 13%) — click an invoice to view & print"
        onExport={() => invoices.length && downloadCsv('invoices.csv', invoices.map((i) => ({
          invoiceNumber: i.invoiceNumber, date: formatDate(i.invoiceDate),
          customer: i.customer?.name || '', subtotal: i.subtotal,
          vat: i.vatAmount, total: i.totalAmount, paid: i.paidAmount, status: i.paymentStatus,
        })))}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow p-4"><div className="text-xs uppercase text-gray-500">Invoices</div><div className="text-2xl font-bold">{invoices.length}</div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="text-xs uppercase text-gray-500">Total Billed</div><div className="text-2xl font-bold font-mono">{formatNumber(totalAmt)}</div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="text-xs uppercase text-gray-500">Collected</div><div className="text-2xl font-bold font-mono text-emerald-600">{formatNumber(paidAmt)}</div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="text-xs uppercase text-gray-500">Outstanding</div><div className="text-2xl font-bold font-mono text-red-600">{formatNumber(outstanding)}</div></div>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-2 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && invoices.length === 0 && <EmptyState message="No invoices found. Create one via the API or seed demo data." />}
      {!loading && !error && invoices.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Invoice #</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-right">VAT</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-3 py-2">{inv.customer?.name || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNumber(inv.subtotal)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNumber(inv.vatAmount)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{formatNumber(inv.totalAmount)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_STYLES[inv.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>{inv.paymentStatus}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/finance/invoices/${inv.id}`} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">View / Print →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
