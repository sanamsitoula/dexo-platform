'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, ErrorState, LoadingState, formatNumber, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function CashFlowPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getCashFlow(subdomain, startDate, endDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate])

  return (
    <div>
      <ReportHeader
        title="Cash Flow Statement"
        subtitle="Operating / Investing / Financing activities"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data && downloadCsv(`cash-flow_${startDate}_${endDate}.csv`, [
          { section: 'Operating', cashReceivedFromCustomers: data.operatingActivities.cashReceivedFromCustomers.toString(), cashPaidToSuppliers: data.operatingActivities.cashPaidToSuppliers.toString(), net: data.operatingActivities.netCashFromOperating.toString() },
          { section: 'Investing', net: data.investingActivities.netCash.toString() },
          { section: 'Financing', net: data.financingActivities.netCash.toString() },
          { section: 'Net Change in Cash', net: data.netChangeInCash.toString() },
        ])}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Operating Net Cash" value={formatNumber(data.operatingActivities.netCashFromOperating)} />
            <StatCard label="Investing Net Cash" value={formatNumber(data.investingActivities.netCash)} />
            <StatCard label="Net Change in Cash" value={formatNumber(data.netChangeInCash)} />
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Cash Flows</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Operating Activities</div>
                <Row label="Cash received from customers" value={data.operatingActivities.cashReceivedFromCustomers} />
                <Row label="Cash paid to suppliers / expenses" value={data.operatingActivities.cashPaidToSuppliers} negative />
                <div className="pt-2 border-t flex justify-between">
                  <span className="font-semibold">Net cash from operating</span>
                  <span className="font-mono font-bold">{formatNumber(data.operatingActivities.netCashFromOperating)}</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Investing Activities</div>
                <Row label="Net cash used in investing" value={data.investingActivities.netCash} negative />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Financing Activities</div>
                <Row label="Net cash from financing" value={data.financingActivities.netCash} />
              </div>
              <div className="my-3 p-3 rounded-lg bg-gray-100 border-t-4 border-blue-500 flex justify-between text-lg">
                <span className="font-semibold">Net Change in Cash</span>
                <span className={`font-mono font-bold ${data.netChangeInCash.isNegative() ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatNumber(data.netChangeInCash)}
                </span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              TODO (MVP): Investing and Financing activities are not yet modeled — both show 0. Cash flow allocation per journal-entry category is a separate workstream.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value, negative }: { label: string; value: any; negative?: boolean }) {
  return (
    <div className="py-1.5 flex justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="font-mono text-sm">
        {negative ? '(' : ''}{formatNumber(value)}{negative ? ')' : ''}
      </span>
    </div>
  )
}