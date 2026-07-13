'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, ErrorState, LoadingState, formatNumber, formatDate, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function VatReturnPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getVatReturn(subdomain, startDate, endDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate])

  return (
    <div>
      <ReportHeader
        title="VAT Return Computation"
        subtitle="Output VAT vs Input VAT — Net Payable to IRD"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data && downloadCsv(`vat-return_${startDate}_${endDate}.csv`, [
          { field: 'Output VAT (collected)', value: String(data.outputVat.amount) },
          { field: 'Input VAT (claimable)', value: String(data.inputVat.amount) },
          { field: 'Net VAT Payable', value: String(data.netVatPayable) },
          { field: 'Invoice Count', value: String(data.outputVat.invoiceCount) },
          { field: 'Bill Count', value: String(data.inputVat.billCount) },
        ])}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Output VAT (Sales)" value={formatNumber(data.outputVat.amount)} hint={`${data.outputVat.invoiceCount} invoices`} />
            <StatCard label="Input VAT (Purchases)" value={formatNumber(data.inputVat.amount)} hint={`${data.inputVat.billCount} bills`} />
            <StatCard
              label={data.isRefundable ? 'VAT Refundable' : 'Net VAT Payable'}
              value={formatNumber(data.netVatPayable)}
              hint={data.isRefundable ? 'Input exceeds output — claim refund' : 'Pay IRD by end of month'}
            />
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Computation</h3>
            <dl className="text-sm">
              <div className="flex justify-between py-2 border-b"><dt>Taxable sales (output base)</dt><dd className="font-mono">{formatNumber(data.outputVat.taxableBase)}</dd></div>
              <div className="flex justify-between py-2 border-b"><dt>Output VAT @ 13%</dt><dd className="font-mono">{formatNumber(data.outputVat.amount)}</dd></div>
              <div className="flex justify-between py-2 border-b"><dt>Taxable purchases (input base)</dt><dd className="font-mono">{formatNumber(data.inputVat.taxableBase)}</dd></div>
              <div className="flex justify-between py-2 border-b"><dt>Input VAT @ 13%</dt><dd className="font-mono">({formatNumber(data.inputVat.amount)})</dd></div>
              <div className="flex justify-between py-3 text-base font-bold">
                <dt>Net VAT {data.isRefundable ? 'Refundable' : 'Payable'}</dt>
                <dd className="font-mono">{formatNumber(data.netVatPayable)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  )
}