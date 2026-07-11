'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { marketplaceApi } from '@/lib/api'
import { ItemThumb, Stars, formatPrice } from '../_shared'
import MagneticButton from '@/components/MagneticButton'

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
      <div className="min-h-screen bg-[#05050a]">
        <div className="max-w-5xl mx-auto px-4 py-20 animate-pulse space-y-6">
          <div className="h-8 bg-white/10 rounded w-1/3" />
          <div className="h-64 bg-white/5 rounded-xl" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-[#05050a]">
        <div className="max-w-5xl mx-auto px-4 py-24 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white">Item not found</h1>
          <p className="text-zinc-500 mt-2">{error}</p>
          <Link href="/marketplace" className="inline-block mt-6 text-cyan-400 hover:underline">← Back to marketplace</Link>
        </div>
      </div>
    )
  }

  const screenshots: string[] = Array.isArray(item.screenshots) ? item.screenshots : []
  const features: string[] = Array.isArray(item.features) ? item.features : []
  const reviews: any[] = item.reviews || []

  return (
    <div className="min-h-screen bg-[#05050a]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/marketplace" className="text-sm text-cyan-400 hover:underline">← Back to marketplace</Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.type === 'template' ? 'bg-indigo-500/15 text-indigo-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{item.type}</span>
              {item.category && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-zinc-400 capitalize">{item.category}</span>}
              {item.domainType && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 capitalize">{item.domainType}</span>}
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white"
              style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
            >
              {item.name}
            </h1>
            <p className="mt-3 text-lg text-zinc-400">{item.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
              <Stars rating={item.ratingAvg} count={item.ratingCount} />
              <span>{item.installCount} installs</span>
              <span>v{item.version}</span>
              <span>by {item.authorName}</span>
            </div>

            <div className="mt-8 rounded-xl overflow-hidden border border-white/10">
              <ItemThumb item={item} className="w-full h-72" />
            </div>

            {screenshots.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {screenshots.map((s, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={s} alt={`${item.name} screenshot ${i + 1}`} className="rounded-lg border border-white/10 w-full h-28 object-cover" />
                ))}
              </div>
            )}

            {item.longDescription && (
              <div className="mt-10">
                <h2 className="text-xl font-bold text-white mb-3">About</h2>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{item.longDescription}</p>
              </div>
            )}

            {/* Reviews */}
            <div className="mt-10">
              <h2 className="text-xl font-bold text-white mb-3">Reviews {reviews.length > 0 && <span className="text-zinc-500 font-normal text-base">({reviews.length})</span>}</h2>
              {reviews.length === 0 ? (
                <p className="text-zinc-500 text-sm">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="glass-card p-4">
                      <div className="flex items-center justify-between">
                        <Stars rating={r.rating} />
                        <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p className="text-sm text-zinc-300 mt-2">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="glass-card p-6 sticky top-24">
              <div className={`text-3xl font-bold ${item.priceCents ? 'text-white' : 'text-emerald-400'}`}>{formatPrice(item)}</div>
              {item.priceCents > 0 && <div className="text-xs text-zinc-500 mt-1">one-time</div>}
              <p className="text-sm text-zinc-400 mt-4">
                Sign in to your business admin console to install this {item.type} for your workspace.
              </p>
              <div className="mt-4 flex">
                <MagneticButton href="/login" variant="primary" className="w-full justify-center">
                  Sign in to install
                </MagneticButton>
              </div>

              {features.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Features</h3>
                  <ul className="space-y-2">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                        <span className="text-emerald-400 mt-0.5">✓</span>
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
    </div>
  )
}
