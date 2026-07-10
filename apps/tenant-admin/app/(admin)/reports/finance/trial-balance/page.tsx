'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tenantFinanceReportsApi } from '@/lib/api'
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatNumber, downloadCsv } from '@/lib/report-utils'

export default function TrialBalancePage() {
  const params = useParams()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getTrialBalance(subdomain, asOfDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, asOfDate])

  return (
    <div>
      <ReportHeader
        title="Trial Balance"
        subtitle="Debit / credit totals per account — must balance"
        startDate={asOfDate}
        endDate={asOfDate}
        onExport={() => data?.accounts && downloadCsv(`trial-balance_${asOfDate}.csv`, data.accounts.map((r: any) => ({
          accountCode: r.accountCode, accountName: r.accountName, accountType: r.accountType,
          debit: r.debit.toString(), credit: r.credit.toString(),
        })))}
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
            {data.isBalanced ? '✓ Trial balance balances' : '✗ Out of balance'}:
            Total Debit <strong className="font-mono">{formatNumber(data.totalDebit)}</strong>
            {' / Total Credit '}<strong className="font-mono">{formatNumber(data.totalCredit)}</strong>
          </div>
          {data.accounts.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Account</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.accounts.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{r.accountCode}</td>
                      <td className="px-3 py-2">{r.accountName}</td>
                      <td className="px-3 py-2 text-xs uppercase">{r.accountType}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatNumber(r.debit)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatNumber(r.credit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td className="px-3 py-3" colSpan={3}>Totals</td>
                    <td className="px-3 py-3 text-right font-mono">{formatNumber(data.totalDebit)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatNumber(data.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}