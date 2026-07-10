'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tenantAccountsApi } from '@/lib/api'
import { ReportHeader, EmptyState, ErrorState, LoadingState, formatNumber } from '@/lib/report-utils'

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS']

export default function ChartOfAccountsPage() {
  const params = useParams()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')

  const [seeding, setSeeding] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    tenantAccountsApi.list(subdomain, typeFilter || undefined).then((r) => {
      if (r.error) setError(r.error); else setAccounts(r.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [subdomain, typeFilter])

  async function loadDefaults() {
    setSeeding(true)
    const r = await tenantAccountsApi.setupDefaults(subdomain)
    setSeeding(false)
    if (r.error) { setError(r.error); return }
    load()
  }

  const grouped = ACCOUNT_TYPES
    .map((t) => ({ type: t, rows: accounts.filter((a) => a.accountType === t) }))
    .filter((g) => g.rows.length > 0)

  return (
    <div>
      <ReportHeader
        title="Chart of Accounts"
        subtitle="Ledger heads (control accounts) and their sub-accounts — Nepal NFRS structure"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {showForm ? '✕ Close' : '+ New Account'}
        </button>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-2 py-2 text-sm bg-white"
        >
          <option value="">All types</option>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={loadDefaults}
          disabled={seeding}
          className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          title="Seed the platform default NFRS chart of accounts + fiscal year"
        >
          {seeding ? 'Loading…' : accounts.length === 0 ? '⚡ Load default chart of accounts' : '↺ Add any missing defaults'}
        </button>
        <div className="ml-auto text-sm text-gray-500 self-center">{accounts.length} accounts</div>
      </div>

      {!loading && !error && accounts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center mb-4">
          <div className="text-4xl">📓</div>
          <div className="font-semibold text-gray-900 mt-2">No chart of accounts yet</div>
          <p className="text-sm text-gray-500 mt-1">Load the platform default NFRS chart (assets, liabilities, equity, revenue, expenses) so your books work immediately. You can rename or add accounts afterwards.</p>
          <button onClick={loadDefaults} disabled={seeding} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
            {seeding ? 'Setting up…' : 'Load default chart of accounts'}
          </button>
        </div>
      )}

      {showForm && <CreateAccountForm subdomain={subdomain} onCreated={() => { setShowForm(false); load() }} accounts={accounts} />}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && accounts.length === 0 && <EmptyState message="No accounts. Seed them via: npm run db:seed:v5" />}
      {!loading && !error && grouped.map(({ type, rows }) => (
        <div key={type} className="mb-6">
          <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-semibold">{type}</h3>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Account Name</th>
                  <th className="px-3 py-2 text-left">Balance</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-right">Postings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{a.accountCode}</td>
                    <td className="px-3 py-2">
                      {a.isControl ? <span className="font-semibold">{a.accountName}</span> : <span className="text-gray-700">↳ {a.accountName}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs uppercase">{a.normalBalance}</td>
                    <td className="px-3 py-2 text-xs">{a.isControl ? <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">Ledger Head</span> : <span className="text-gray-400">Sub-account</span>}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">{formatNumber(a._count?.journalEntryLines || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function CreateAccountForm({ subdomain, onCreated, accounts }: { subdomain: string; onCreated: () => void; accounts: any[] }) {
  const [form, setForm] = useState({ accountCode: '', accountName: '', accountType: 'ASSET', parentId: '', isControl: false, currency: 'NPR' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const controlOptions = accounts.filter((a) => a.isControl && a.accountType === form.accountType)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr(null)
    tenantAccountsApi.create(subdomain, {
      accountCode: form.accountCode,
      accountName: form.accountName,
      accountType: form.accountType,
      parentId: form.parentId || undefined,
      isControl: form.isControl,
      currency: form.currency,
    }).then((r) => {
      if (r.error) setErr(r.error); else onCreated()
    }).finally(() => setSaving(false))
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="col-span-2 md:col-span-3 text-sm font-semibold text-gray-700">New ledger account</div>
      <input required placeholder="Code (e.g. 1110)" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} className="border rounded px-3 py-2 text-sm" />
      <input required placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="border rounded px-3 py-2 text-sm col-span-2" />
      <select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value, parentId: '' })} className="border rounded px-3 py-2 text-sm">
        {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="border rounded px-3 py-2 text-sm" disabled={controlOptions.length === 0}>
        <option value="">No parent</option>
        {controlOptions.map((a) => <option key={a.id} value={a.id}>{a.accountCode} · {a.accountName}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isControl} onChange={(e) => setForm({ ...form, isControl: e.target.checked })} />
        Control account (ledger head)
      </label>
      {err && <div className="col-span-full text-sm text-red-600">{err}</div>}
      <div className="col-span-full flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Create account'}
        </button>
      </div>
    </form>
  )
}
