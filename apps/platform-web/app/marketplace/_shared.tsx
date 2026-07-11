'use client'

const GRADIENTS = [
  'from-indigo-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-fuchsia-500',
]

export function gradientFor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

/** Thumbnail with gradient-letter fallback. */
export function ItemThumb({ item, className = 'w-full h-44' }: { item: any; className?: string }) {
  if (item.thumbnail) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.thumbnail} alt={item.name} className={`${className} object-cover`} />
  }
  return (
    <div className={`${className} bg-gradient-to-br ${gradientFor(item.name || '?')} flex items-center justify-center`}>
      <span className="text-4xl font-bold text-white/90">{(item.name || '?')[0]}</span>
    </div>
  )
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating || 0)
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-400 leading-none">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i}>{i <= full ? '★' : '☆'}</span>
        ))}
      </span>
      {count !== undefined && <span className="text-gray-400 text-xs">({count})</span>}
    </span>
  )
}

export function formatPrice(item: any) {
  if (!item.priceCents) return 'Free'
  return `${item.currency || 'NPR'} ${(item.priceCents / 100).toLocaleString()}`
}
