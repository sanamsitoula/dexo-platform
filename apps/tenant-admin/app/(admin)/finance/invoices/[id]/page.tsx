'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { tenantInvoicesApi } from '@/lib/api'
import { LoadingState, ErrorState, formatNumber, formatDate } from '@/lib/report-utils'

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const id = params?.id as string
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [printMeta, setPrintMeta] = useState<{ printType: string; copyNumber: number; watermark: string | null } | null>(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    tenantInvoicesApi.get(subdomain, id).then((r) => {
      if (r.error) setError(r.error); else setInvoice(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, id])

  const handlePrint = async () => {
    setPrinting(true)
    const r = await tenantInvoicesApi.print(subdomain, id)
    setPrinting(false)
    if (r.data) {
      setPrintMeta({ printType: r.data.printType, copyNumber: r.data.copyNumber, watermark: r.data.watermark })
    }
    // Allow the watermark state to render, then open the print dialog.
    setTimeout(() => window.print(), 100)
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!invoice) return <ErrorState message="Invoice not found" />

  const items = invoice.items || []

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="no-print flex items-center gap-3 mb-4">
        <Link href="/finance/invoices" className="text-sm text-gray-500 hover:text-gray-700">← Back to invoices</Link>
        <button
          onClick={handlePrint}
          disabled={printing}
          className="ml-auto px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {printing ? 'Preparing…' : '🖨 Print / Save PDF'}
        </button>
        {printMeta && (
          <span className="text-xs text-gray-500">
            {printMeta.printType === 'ORIGINAL' ? 'Original printed' : `Copy #${printMeta.copyNumber} printed`}
          </span>
        )}
      </div>

      {/* Printable invoice document */}
      <div id="printable-invoice" className="bg-white rounded-lg shadow p-8 max-w-3xl mx-auto print:shadow-none print:rounded-none print:max-w-none">
        {printMeta?.watermark && (
          <div className="print-only text-center text-red-600 font-bold text-lg border-2 border-red-300 rounded py-1 mb-4">
            {printMeta.watermark}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subdomain.toUpperCase()}</h1>
            <p className="text-sm text-gray-500">Tax Invoice</p>
            <p className="text-xs text-gray-400 mt-1">{invoice.branch?.name || 'Main Branch'}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 font-mono">{invoice.invoiceNumber}</div>
            <div className="text-sm text-gray-600">Date: {formatDate(invoice.invoiceDate)}</div>
            {invoice.dueDate && <div className="text-sm text-gray-600">Due: {formatDate(invoice.dueDate)}</div>}
            <div className="text-xs text-gray-400 mt-1">{invoice.invoiceType}</div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-4">
          <div className="text-xs uppercase text-gray-400 mb-1">Bill To</div>
          <div className="font-semibold text-gray-900">{invoice.customer?.name || 'Walk-in Customer'}</div>
          {invoice.customerPan && <div className="text-sm text-gray-600">PAN: {invoice.customerPan}</div>}
          {invoice.billingAddress && <div className="text-sm text-gray-600">{invoice.billingAddress}</div>}
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-4">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Unit Price</th>
              <th className="px-2 py-2 text-right">Disc</th>
              <th className="px-2 py-2 text-right">Taxable</th>
              <th className="px-2 py-2 text-right">VAT</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item: any, i: number) => (
              <tr key={i}>
                <td className="px-2 py-2">{item.itemNo}</td>
                <td className="px-2 py-2">{item.description}</td>
                <td className="px-2 py-2 text-right font-mono">{formatNumber(item.quantity)}</td>
                <td className="px-2 py-2 text-right font-mono">{formatNumber(item.unitPrice)}</td>
                <td className="px-2 py-2 text-right font-mono">{formatNumber(item.discountAmount)}</td>
                <td className="px-2 py-2 text-right font-mono">{formatNumber(item.taxableAmount)}</td>
                <td className="px-2 py-2 text-right font-mono">{formatNumber(item.vatAmount)}</td>
                <td className="px-2 py-2 text-right font-mono font-semibold">{formatNumber(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-mono">{formatNumber(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="font-mono">-{formatNumber(invoice.discountAmount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Taxable Amount</span><span className="font-mono">{formatNumber(invoice.taxableAmount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">VAT (13%)</span><span className="font-mono">{formatNumber(invoice.vatAmount)}</span></div>
            <div className="flex justify-between text-base font-bold border-t-2 border-gray-800 pt-1 mt-1"><span>Grand Total</span><span className="font-mono">NPR {formatNumber(invoice.totalAmount)}</span></div>
            <div className="flex justify-between text-emerald-700"><span>Paid</span><span className="font-mono">{formatNumber(invoice.paidAmount)}</span></div>
            {Number(invoice.totalAmount) - Number(invoice.paidAmount) > 0 && (
              <div className="flex justify-between text-red-600 font-semibold"><span>Balance Due</span><span className="font-mono">{formatNumber(Number(invoice.totalAmount) - Number(invoice.paidAmount))}</span></div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 mt-6 pt-3 text-xs text-gray-400 text-center">
          <p>This is a computer-generated invoice and is valid without signature.</p>
          <p>Thank you for your business! · Currency: {invoice.currency || 'NPR'}</p>
        </div>
      </div>

      {/* Print styles: hide everything except the invoice document when printing */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  )
}
