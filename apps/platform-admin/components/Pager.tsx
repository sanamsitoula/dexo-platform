'use client'

export default function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
      <span>{from}–{to} of {total}</span>
      <span className="space-x-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40">‹ Prev</button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next ›</button>
      </span>
    </div>
  )
}
