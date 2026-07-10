'use client'

/**
 * Shared helpers for tenant-admin report pages.
 * NOTE: MVP — CSV-only export. Native Excel/PDF is a TODO per implementation_plan_4_6_ird_reports.md.
 */

export function formatNumber(n: any): string {
  if (n === null || n === undefined) return '0'
  if (typeof n === 'string') return parseFloat(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (typeof n === 'object' && typeof n.toString === 'function') return parseFloat(n.toString()).toLocaleString(undefined, { maximumFractionDigits: 2 })
  return String(n)
}

export function formatDate(d: any): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 10)
}

export function formatDateTime(d: any): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/** Default period: current Nepali fiscal-month window. MVP: last 30 days. */
export function defaultPeriod(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
}

/** Trigger a CSV download in the browser. */
export function downloadCsv(filename: string, rows: Record<string, any>[]): void {
  if (!rows.length) {
    alert('No data to export')
    return
  }
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ReportHeader({ title, subtitle, startDate, endDate, onExport }: {
  title: string
  subtitle: string
  startDate?: string
  endDate?: string
  onExport?: () => void
}) {
  return (
    <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {subtitle}
          {startDate && endDate && <> · Period: {formatDate(startDate)} → {formatDate(endDate)}</>}
        </p>
      </div>
      {onExport && (
        <button
          onClick={onExport}
          className="px-3 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
        >
          ↓ Export CSV
        </button>
      )}
    </div>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  )
}

export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-10 text-center text-gray-400">
      {message ?? 'No data in selected period.'}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
      Error: {message}
    </div>
  )
}

export function LoadingState() {
  return <div className="text-gray-400">Loading report…</div>
}