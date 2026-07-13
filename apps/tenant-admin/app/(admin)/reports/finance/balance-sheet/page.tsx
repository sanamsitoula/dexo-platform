'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, ErrorState, LoadingState, formatNumber, formatDate, downloadCsv } from '@/lib/report-utils'

export default function BalanceSheetPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getBalanceSheet(subdomain, asOfDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, asOfDate])

  const flatRows = (data: any) => [
    ...(data?.assets?.current ?? []).map((r: any) => ({ section: 'Current Assets', code: r.accountCode, name: r.accountName, balance: r.balance.toString() })),
    ...(data?.assets?.nonCurrent ?? []).map((r: any) => ({ section: 'Non-Current Assets', code: r.accountCode, name: r.accountName, balance: r.balance.toString() })),
    ...(data?.liabilities?.current ?? []).map((r: any) => ({ section: 'Current Liabilities', code: r.accountCode, name: r.accountName, balance: r.balance.toString() })),
    ...(data?.liabilities?.nonCurrent ?? []).map((r: any) => ({ section: 'Non-Current Liabilities', code: r.accountCode, name: r.accountName, balance: r.balance.toString() })),
    ...(data?.equity?.items ?? []).map((r: any) => ({ section: 'Equity', code: r.accountCode, name: r.accountName, balance: r.balance.toString() })),
  ]

  return (
    <div>
      <ReportHeader
        title="Statement of Financial Position"
        subtitle="NFRS Balance Sheet"
        startDate={asOfDate}
        endDate={asOfDate}
        onExport={() => data && downloadCsv(`balance-sheet_${asOfDate}.csv`, flatRows(data))}
      />
      <div className="mb-4">
        <label className="text-sm text-gray-600 mr-2">As of:</label>
        <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className={`mb-4 p-3 rounded text-sm ${data.isBalanced ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {data.isBalanced ? '✓ Balanced' : '✗ Out of balance'}:
            Assets <strong className="font-mono">{formatNumber(data.assets.total)}</strong>
            {' = Liabilities '}<strong className="font-mono">{formatNumber(data.liabilities.total)}</strong>
            {' + Equity '}<strong className="font-mono">{formatNumber(data.equity.total)}</strong>
            {' = '}<strong className="font-mono">{formatNumber(data.totalLiabilitiesAndEquity)}</strong>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Assets" rows={[...data.assets.current, ...data.assets.nonCurrent]} total={data.assets.total} sections={{ 'Current Assets': data.assets.current, 'Non-Current Assets': data.assets.nonCurrent }} />
            <div className="space-y-4">
              <Section title="Liabilities" rows={[]} total={data.liabilities.total} sections={{ 'Current Liabilities': data.liabilities.current, 'Non-Current Liabilities': data.liabilities.nonCurrent }} />
              <Section title="Equity" rows={data.equity.items} total={data.equity.total} sections={{ 'Equity': data.equity.items }} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, sections, total }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {Object.entries(sections).map(([label, rows]: any) => (
        <div key={label} className="mb-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
          {(rows as any[]).length === 0 ? (
            <div className="py-2 text-sm text-gray-400">No entries</div>
          ) : (
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {(rows as any[]).map((r: any) => (
                  <tr key={r.accountId}>
                    <td className="py-1.5 pr-3 font-mono text-xs text-gray-500">{r.accountCode}</td>
                    <td className="py-1.5 pr-3">{r.accountName}</td>
                    <td className="py-1.5 text-right font-mono">{formatNumber(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
      <div className="pt-2 border-t flex justify-between">
        <span className="font-semibold">Total {title}</span>
        <span className="font-mono font-bold">{formatNumber(total)}</span>
      </div>
    </div>
  )
}