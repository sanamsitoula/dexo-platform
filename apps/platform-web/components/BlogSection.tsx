'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { blogApi } from '@/lib/api'

const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-purple-500 to-pink-600',
  'from-blue-500 to-indigo-600',
]

export function BlogThumb({ blog, index = 0, className = '' }: { blog: any; index?: number; className?: string }) {
  if (blog.featuredImage) {
    return <img src={blog.featuredImage} alt={blog.title} className={`object-cover ${className}`} />
  }
  return (
    <div className={`bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} flex items-center justify-center ${className}`}>
      <span className="text-5xl font-extrabold text-white/80">{(blog.title || '?').charAt(0).toUpperCase()}</span>
    </div>
  )
}

export default function BlogSection() {
  const [blogs, setBlogs] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    blogApi.list({ limit: 3 }).then((r) => {
      const payload: any = r.data
      if (payload) setBlogs(Array.isArray(payload) ? payload : payload.data || [])
      setLoaded(true)
    })
  }, [])

  if (loaded && blogs.length === 0) return null

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">From the Blog</h2>
            <p className="mt-3 text-lg text-gray-600">Product news, guides and insights from the Dexo team.</p>
          </div>
          <Link href="/blog" className="hidden sm:inline text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            View all posts →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(loaded ? blogs : [null, null, null]).map((blog, i) =>
            blog ? (
              <Link
                key={blog.id}
                href={`/blog/${blog.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                <BlogThumb blog={blog} index={i} className="w-full h-44" />
                <div className="p-5 flex-1 flex flex-col">
                  {blog.category?.name && (
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">{blog.category.name}</span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">{blog.title}</h3>
                  {blog.excerpt && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{blog.excerpt}</p>}
                  <div className="mt-auto pt-4 flex items-center gap-3 text-xs text-gray-400">
                    <span>{new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>·</span>
                    <span>👁 {blog.viewCount ?? 0} views</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="w-full h-44 bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            )
          )}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/blog" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">View all posts →</Link>
        </div>
      </div>
    </section>
  )
}
