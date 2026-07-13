'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, ErrorState, LoadingState, formatNumber, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function IncomeStatementPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getIncomeStatement(subdomain, startDate, endDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate])

  return (
    <div>
      <ReportHeader
        title="Statement of Profit or Loss"
        subtitle="NFRS Income Statement"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data && downloadCsv(`income-statement_${startDate}_${endDate}.csv`, [
          ...data.revenue.items.map((r: any) => ({ section: 'Revenue', code: r.accountCode, name: r.accountName, amount: r.balance.toString() })),
          ...data.costOfGoodsSold.items.map((r: any) => ({ section: 'COGS', code: r.accountCode, name: r.accountName, amount: r.balance.toString() })),
          ...data.operatingExpenses.items.map((r: any) => ({ section: 'Operating Expenses', code: r.accountCode, name: r.accountName, amount: r.balance.toString() })),
        ])}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Net Revenue" value={formatNumber(data.revenue.total)} />
            <StatCard label="Gross Profit" value={formatNumber(data.grossProfit)} />
            <StatCard label="Operating Expenses" value={formatNumber(data.operatingExpenses.total)} />
            <StatCard
              label={data.netIncome.isNegative() ? 'Net Loss' : 'Net Profit'}
              value={formatNumber(data.netIncome)}
            />
          </div>
          <PAndLGroup title="Revenue" rows={data.revenue.items} total={data.revenue.total} />
          <PAndLGroup title="Cost of Revenue" rows={data.costOfGoodsSold.items} total={data.costOfGoodsSold.total} />
          <div className="px-4 py-2 flex justify-between bg-gray-100 border-y">
            <span className="font-semibold">Gross Profit</span>
            <span className="font-mono font-bold">{formatNumber(data.grossProfit)}</span>
          </div>
          <PAndLGroup title="Operating Expenses" rows={data.operatingExpenses.items} total={data.operatingExpenses.total} />
          <div className="my-3 p-3 rounded-lg bg-gray-100 border-t-4 border-emerald-500 flex justify-between text-lg">
            <span className="font-semibold">{data.netIncome.isNegative() ? 'NET LOSS' : 'NET PROFIT'}</span>
            <span className={`font-mono font-bold ${data.netIncome.isNegative() ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatNumber(data.netIncome)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function PAndLGroup({ title, rows, total }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-5 my-3">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <div className="py-2 text-sm text-gray-400">No entries for the period</div>
      ) : (
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {rows.map((r: any) => (
              <tr key={r.accountId}>
                <td className="py-1.5 pr-3 font-mono text-xs text-gray-500">{r.accountCode}</td>
                <td className="py-1.5 pr-3">{r.accountName}</td>
                <td className="py-1.5 text-right font-mono">{formatNumber(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pt-2 border-t mt-2 flex justify-between">
        <span className="font-semibold">Total {title}</span>
        <span className="font-mono font-bold">{formatNumber(total)}</span>
      </div>
    </div>
  )
}