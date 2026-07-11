'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { marketplaceApi } from '@/lib/api'
import { ItemThumb, Stars, formatPrice } from '../_shared'

export default function MarketplaceDetailPage() {
  const params = useParams()
  const slug = String(params?.slug || '')
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    marketplaceApi.getBySlug(slug).then((r) => {
      if (r.data) setItem(r.data)
      else setError(r.error || 'Item not found')
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 animate-pulse space-y-6">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="h-64 bg-gray-100 rounded-xl" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900">Item not found</h1>
        <p className="text-gray-500 mt-2">{error}</p>
        <Link href="/marketplace" className="inline-block mt-6 text-indigo-600 hover:underline">← Back to marketplace</Link>
      </div>
    )
  }

  const screenshots: string[] = Array.isArray(item.screenshots) ? item.screenshots : []
  const features: string[] = Array.isArray(item.features) ? item.features : []
  const reviews: any[] = item.reviews || []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link href="/marketplace" className="text-sm text-indigo-600 hover:underline">← Back to marketplace</Link>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.type === 'template' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.type}</span>
            {item.category && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">{item.category}</span>}
            {item.domainType && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 capitalize">{item.domainType}</span>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{item.name}</h1>
          <p className="mt-3 text-lg text-gray-600">{item.description}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <Stars rating={item.ratingAvg} count={item.ratingCount} />
            <span>{item.installCount} installs</span>
            <span>v{item.version}</span>
            <span>by {item.authorName}</span>
          </div>

          <div className="mt-8 rounded-xl overflow-hidden border border-gray-200">
            <ItemThumb item={item} className="w-full h-72" />
          </div>

          {screenshots.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {screenshots.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={s} alt={`${item.name} screenshot ${i + 1}`} className="rounded-lg border border-gray-200 w-full h-28 object-cover" />
              ))}
            </div>
          )}

          {item.longDescription && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{item.longDescription}</p>
            </div>
          )}

          {/* Reviews */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal text-base">({reviews.length})</span>}</h2>
            {reviews.length === 0 ? (
              <p className="text-gray-500 text-sm">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 sticky top-24">
            <div className={`text-3xl font-bold ${item.priceCents ? 'text-gray-900' : 'text-emerald-600'}`}>{formatPrice(item)}</div>
            {item.priceCents > 0 && <div className="text-xs text-gray-400 mt-1">one-time</div>}
            <p className="text-sm text-gray-600 mt-4">
              Sign in to your business admin console to install this {item.type} for your workspace.
            </p>
            <Link
              href="/login"
              className="mt-4 block text-center rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700"
            >
              Sign in to install
            </Link>

            {features.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Features</h3>
                <ul className="space-y-2">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
