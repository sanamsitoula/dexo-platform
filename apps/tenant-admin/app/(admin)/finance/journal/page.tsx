'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tenantJournalApi, tenantAccountsApi } from '@/lib/api'
import { ReportHeader, EmptyState, ErrorState, LoadingState, formatNumber, formatDate, downloadCsv } from '@/lib/report-utils'

type Line = { accountId: string; debit: string; credit: string; description: string }

export default function JournalPage() {
  const params = useParams()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const [entries, setEntries] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    Promise.all([
      tenantJournalApi.list(subdomain).then((r) => r.error ? [] : r.data || []),
      tenantAccountsApi.list(subdomain).then((r) => r.error ? [] : r.data || []),
    ]).then(([je, accts]) => {
      setEntries(je)
      setAccounts(accts.filter((a) => !a.isControl))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [subdomain])

  return (
    <div>
      <ReportHeader
        title="Journal Entries"
        subtitle="Manual double-entry postings — debits must equal credits"
        onExport={() => entries.length && downloadCsv('journal-entries.csv', entries.map((e: any) => ({
          entryNo: e.entryNo, date: formatDate(e.entryDate), description: e.description,
          posted: e.isPosted ? 'YES' : 'DRAFT', reversed: e.isReversed ? 'YES' : 'NO',
          debit: e.lines?.reduce((s: number, l: any) => s + Number(l.debitAmount), 0),
          credit: e.lines?.reduce((s: number, l: any) => s + Number(l.creditAmount), 0),
        })))}
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {showForm ? '✕ Close' : '+ New Journal Entry'}
        </button>
      </div>

      {showForm && <CreateJournalForm subdomain={subdomain} accounts={accounts} onCreated={() => { setShowForm(false); load() }} />}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && entries.length === 0 && <EmptyState message="No journal entries yet. Create one above." />}
      {!loading && !error && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((e) => {
            const debit = e.lines?.reduce((s: number, l: any) => s + Number(l.debitAmount), 0) || 0
            const credit = e.lines?.reduce((s: number, l: any) => s + Number(l.creditAmount), 0) || 0
            return (
              <div key={e.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <div className="font-mono text-sm font-semibold text-gray-900">{e.entryNo}</div>
                    <div className="text-sm text-gray-700">{e.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(e.entryDate)} · {e.referenceType || 'MANUAL'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.isReversed ? (
                      <span className="px-2 py-1 rounded text-xs bg-red-50 text-red-700">REVERSED</span>
                    ) : e.isPosted ? (
                      <span className="px-2 py-1 rounded text-xs bg-emerald-50 text-emerald-700">POSTED</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-amber-50 text-amber-700">DRAFT</span>
                    )}
                    <div className="text-right text-xs">
                      <div className="font-mono text-gray-700">DR {formatNumber(debit)}</div>
                      <div className="font-mono text-gray-500">CR {formatNumber(credit)}</div>
                    </div>
                  </div>
                </div>
                {e.lines && e.lines.length > 0 && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <table className="w-full text-xs">
                      <tbody>
                        {e.lines.map((l: any, i: number) => (
                          <tr key={i}>
                            <td className="py-0.5 font-mono text-gray-400 w-20">{l.account?.accountCode}</td>
                            <td className="py-0.5 text-gray-700">{l.account?.accountName}{l.description ? ` — ${l.description}` : ''}</td>
                            <td className="py-0.5 text-right font-mono text-gray-700 w-24">{Number(l.debitAmount) ? formatNumber(l.debitAmount) : ''}</td>
                            <td className="py-0.5 text-right font-mono text-gray-500 w-24">{Number(l.creditAmount) ? formatNumber(l.creditAmount) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CreateJournalForm({ subdomain, accounts, onCreated }: { subdomain: string; accounts: any[]; onCreated: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [entryDate, setEntryDate] = useState(today)
  const [description, setDescription] = useState('')
  const [narration, setNarration] = useState('')
  const [autoPost, setAutoPost] = useState(true)
  const [lines, setLines] = useState<Line[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  const updateLine = (i: number, patch: Partial<Line>) => {
    const next = [...lines]
    next[i] = { ...next[i], ...patch }
    // Entering a debit clears credit and vice-versa on the same line.
    if (patch.debit && parseFloat(patch.debit)) next[i].credit = ''
    if (patch.credit && parseFloat(patch.credit)) next[i].debit = ''
    setLines(next)
  }
  const addLine = () => setLines([...lines, { accountId: '', debit: '', credit: '', description: '' }])
  const removeLine = (i: number) => setLines(lines.length > 2 ? lines.filter((_, idx) => idx !== i) : lines)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!description.trim()) { setErr('Description is required'); return }
    if (!balanced) { setErr(`Debits (${totalDebit}) must equal credits (${totalCredit})`); return }
    if (lines.some((l) => !l.accountId)) { setErr('Every line needs an account'); return }

    setSaving(true)
    tenantJournalApi.create(subdomain, {
      entryDate,
      description,
      narration: narration || undefined,
      autoPost,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debitAmount: l.debit || '0',
        creditAmount: l.credit || '0',
        description: l.description || undefined,
      })),
    }).then((r) => {
      if (r.error) setErr(r.error); else onCreated()
    }).finally(() => setSaving(false))
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500">Entry date</label>
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" required />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">Description</label>
          <input placeholder="e.g. Monthly rent payment" value={description} onChange={(e) => setDescription(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" required />
        </div>
      </div>
      <input placeholder="Narration (optional)" value={narration} onChange={(e) => setNarration(e.target.value)} className="border rounded px-3 py-2 text-sm w-full mb-3" />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left py-1 pr-2">Account</th>
              <th className="text-left py-1 pr-2">Description</th>
              <th className="text-right py-1 pr-2 w-28">Debit (NPR)</th>
              <th className="text-right py-1 pr-2 w-28">Credit (NPR)</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <select value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })} className="border rounded px-2 py-1 text-sm w-full min-w-[180px]">
                    <option value="">Select account…</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountCode} · {a.accountName}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} className="border rounded px-2 py-1 text-sm w-full" placeholder="Line memo" />
                </td>
                <td className="py-1 pr-2">
                  <input type="number" step="0.01" value={l.debit} onChange={(e) => updateLine(i, { debit: e.target.value })} className="border rounded px-2 py-1 text-sm w-full text-right" />
                </td>
                <td className="py-1 pr-2">
                  <input type="number" step="0.01" value={l.credit} onChange={(e) => updateLine(i, { credit: e.target.value })} className="border rounded px-2 py-1 text-sm w-full text-right" />
                </td>
                <td className="py-1">
                  <button type="button" onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-semibold">
            <tr>
              <td colSpan={2} className="py-2"></td>
              <td className="py-2 text-right font-mono">{formatNumber(totalDebit)}</td>
              <td className="py-2 text-right font-mono">{formatNumber(totalCredit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button type="button" onClick={addLine} className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50">+ Add line</button>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} />
          Post immediately
        </label>
        <span className={`text-sm ${balanced ? 'text-emerald-600' : 'text-red-600'}`}>
          {balanced ? '✓ Balanced' : `✗ Difference: ${formatNumber(Math.abs(totalDebit - totalCredit))}`}
        </span>
        {err && <span className="text-sm text-red-600">{err}</span>}
        <button type="submit" disabled={saving || !balanced} className="ml-auto px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save entry'}
        </button>
      </div>
    </form>
  )
}
