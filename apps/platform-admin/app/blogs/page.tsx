'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { blogApi, blogCategoryApi } from '@/lib/api'

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchBlogs()
    fetchCategories()
  }, [page, statusFilter, categoryFilter])

  async function fetchBlogs() {
    setLoading(true)
    const params: any = { page, limit: 10 }
    if (statusFilter) params.status = statusFilter
    if (categoryFilter) params.categoryId = categoryFilter
    if (search) params.search = search

    const response = await blogApi.list(params)
    if (response.data) {
      setBlogs(response.data.data || [])
      setTotalPages(response.data.meta?.totalPages || 1)
    }
    setLoading(false)
  }

  async function fetchCategories() {
    const response = await blogCategoryApi.list()
    if (response.data) {
      setCategories(Array.isArray(response.data) ? response.data : [])
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this blog?')) return
    const response = await blogApi.delete(id)
    if (!response.error) {
      fetchBlogs()
    }
  }

  async function handlePublish(id: string) {
    const response = await blogApi.publish(id)
    if (!response.error) {
      fetchBlogs()
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    archived: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blogs</h1>
          <p className="mt-2 text-gray-600">Manage platform and tenant blogs</p>
        </div>
        <Link
          href="/blogs/new"
          className="btn-primary"
        >
          Create Blog
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search blogs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBlogs()}
              className="input-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="input-primary w-auto"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
            className="input-primary w-auto"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading blogs...</div>
        </div>
      ) : blogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No blogs found</p>
          <Link href="/blogs/new" className="btn-primary mt-4 inline-block">
            Create your first blog
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blogs.map((blog) => (
                <tr key={blog.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {blog.featuredImage && (
                        <img src={blog.featuredImage} alt="" className="w-12 h-12 rounded object-cover mr-3" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                        {blog.excerpt && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{blog.excerpt}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {blog.author?.firstName || blog.author?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {blog.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[blog.status] || 'bg-gray-100'}`}>
                      {blog.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{blog.viewCount || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/blogs/${blog.id}`} className="text-blue-600 hover:text-blue-900">
                        Edit
                      </Link>
                      {blog.status === 'draft' && (
                        <button onClick={() => handlePublish(blog.id)} className="text-green-600 hover:text-green-900">
                          Publish
                        </button>
                      )}
                      <button onClick={() => handleDelete(blog.id)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
