'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { marketplaceApi } from '@/lib/api'
import { ItemThumb, Stars, formatPrice } from './_shared'

const CATEGORIES = ['all', 'fitness', 'restaurant', 'salon', 'school', 'general', 'communication', 'operations', 'website', 'finance']
const PAGE_SIZE = 9

export default function MarketplacePage() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    marketplaceApi
      .list({
        type: type !== 'all' ? type : undefined,
        category: category !== 'all' ? category : undefined,
        search: query || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      })
      .then((r) => {
        if (r.data) {
          setItems(r.data.items || [])
          setTotal(r.data.total || 0)
        } else if (r.error) setError(r.error)
        setLoading(false)
      })
  }, [type, category, query, sort, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Marketplace</h1>
        <p className="mt-4 text-lg text-gray-600">Website templates and plugins to power your Dexo business.</p>
      </div>

      {/* Filters */}
      <form
        className="flex flex-wrap items-center justify-center gap-3 mb-10"
        onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search) }}
      >
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {['all', 'template', 'plugin'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setPage(1) }}
              className={`px-4 py-2 text-sm font-medium capitalize ${type === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {t === 'all' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-700"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All categories' : c[0].toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-700"
        >
          <option value="popular">Most popular</option>
          <option value="newest">Newest</option>
          <option value="rating">Top rated</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates & plugins…"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-64"
        />
        <button type="submit" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700">Search</button>
      </form>

      {error && <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm text-center">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="w-full h-44 bg-gray-100" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">🛍️</div>
          No marketplace items match your filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/marketplace/${item.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition"
              >
                <ItemThumb item={item} />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.type === 'template' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.type}
                    </span>
                    {item.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">{item.category}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">{item.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                      <Stars rating={item.ratingAvg} count={item.ratingCount} />
                      <span className="text-xs text-gray-400">{item.installCount} installs</span>
                    </div>
                    <span className={`text-sm font-bold ${item.priceCents ? 'text-gray-900' : 'text-emerald-600'}`}>{formatPrice(item)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-12">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
