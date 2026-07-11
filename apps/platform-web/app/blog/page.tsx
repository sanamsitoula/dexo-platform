'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { blogApi } from '@/lib/api'
import { BlogThumb } from '@/components/BlogSection'

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    blogApi.list({ page, limit: 9 }).then((r) => {
      if (r.data) {
        const payload: any = r.data
        setBlogs(Array.isArray(payload) ? payload : payload.data || [])
        setTotalPages(payload.meta?.totalPages || 1)
      } else if (r.error) {
        setError(r.error)
      }
      setLoading(false)
    })
  }, [page])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Dexo Blog</h1>
        <p className="mt-4 text-lg text-gray-600">Product news, guides and insights from the Dexo team.</p>
      </div>

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
      ) : blogs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📝</div>
          No blog posts published yet. Check back soon!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog, i) => (
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
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">{blog.title}</h2>
                  {blog.excerpt && <p className="mt-2 text-sm text-gray-600 line-clamp-3">{blog.excerpt}</p>}
                  <div className="mt-auto pt-4 flex items-center gap-3 text-xs text-gray-400">
                    <span>{new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>·</span>
                    <span>👁 {blog.viewCount ?? 0} views</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
