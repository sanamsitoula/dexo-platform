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
    <div className="min-h-screen bg-[#05050a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h1
            className="text-4xl sm:text-5xl font-bold text-white"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            Marketplace
          </h1>
          <p className="mt-4 text-lg text-zinc-400">Website templates and plugins to power your Dexo business.</p>
        </div>

        {/* Filters */}
        <form
          className="flex flex-wrap items-center justify-center gap-3 mb-10"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search) }}
        >
          <div className="flex rounded-lg border border-white/10 overflow-hidden bg-white/5 backdrop-blur-md">
            {['all', 'template', 'plugin'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setPage(1) }}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${type === t ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 text-white' : 'text-zinc-300 hover:bg-white/10'}`}
              >
                {t === 'all' ? 'All' : `${t}s`}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#0a0a12] text-zinc-200">{c === 'all' ? 'All categories' : c[0].toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <option value="popular" className="bg-[#0a0a12]">Most popular</option>
            <option value="newest" className="bg-[#0a0a12]">Newest</option>
            <option value="rating" className="bg-[#0a0a12]">Top rated</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates & plugins…"
            className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-sm w-64 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 text-white px-4 py-2 text-sm font-semibold shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-shadow"
          >
            Search
          </button>
        </form>

        {error && <div className="mb-8 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-md text-sm text-center">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card overflow-hidden animate-pulse">
                <div className="w-full h-44 bg-white/5" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
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
                  className="group glass-card glass-card-hover overflow-hidden flex flex-col"
                >
                  <ItemThumb item={item} />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.type === 'template' ? 'bg-indigo-500/15 text-indigo-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                        {item.type}
                      </span>
                      {item.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-zinc-400 capitalize">{item.category}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{item.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <Stars rating={item.ratingAvg} count={item.ratingCount} />
                        <span className="text-xs text-zinc-500">{item.installCount} installs</span>
                      </div>
                      <span className={`text-sm font-bold ${item.priceCents ? 'text-white' : 'text-emerald-400'}`}>{formatPrice(item)}</span>
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
                  className="px-4 py-2 rounded-md border border-white/10 bg-white/5 text-zinc-200 text-sm hover:bg-white/10 disabled:opacity-40 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 rounded-md border border-white/10 bg-white/5 text-zinc-200 text-sm hover:bg-white/10 disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
