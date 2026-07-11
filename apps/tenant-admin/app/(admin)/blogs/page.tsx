'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { blogApi } from '@/lib/api';
import { PageHeader, Card, EmptyState, Badge, Btn } from '../_ui';

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'gray' | 'red' | 'indigo'> = {
  published: 'green',
  draft: 'gray',
  scheduled: 'indigo',
  archived: 'amber',
};

export default function BlogsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain, status, page]);

  async function fetchBlogs() {
    setLoading(true);
    const r = await blogApi.list(subdomain, { status: status || undefined, search: search || undefined, page, limit: 10 });
    if (r.data) {
      const payload: any = r.data;
      setBlogs(Array.isArray(payload) ? payload : payload.data || []);
      setTotalPages(payload.meta?.totalPages || 1);
      setError(null);
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  async function handleDelete(blog: any) {
    if (!confirm(`Delete blog "${blog.title}"? This cannot be undone.`)) return;
    const r = await blogApi.remove(subdomain, blog.id);
    if (r.error) alert(r.error);
    else fetchBlogs();
  }

  async function handlePublish(blog: any) {
    const r = await blogApi.publish(subdomain, blog.id);
    if (r.error) alert(r.error);
    else fetchBlogs();
  }

  return (
    <div>
      <PageHeader
        title="Blogs"
        subtitle="Publish news, tips and stories on your public website"
        action={
          <div className="flex items-center gap-2">
            <Link href="/blogs/categories" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              Categories
            </Link>
            <Link href="/blogs/new" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">
              + New Blog
            </Link>
          </div>
        }
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchBlogs())}
          placeholder="Search blogs…"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-64"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : blogs.length === 0 ? (
          <EmptyState icon="📝" title="No blogs yet" msg="Write your first blog post to engage members and visitors." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Blog</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Views</th>
                  <th className="text-left px-4 py-3 font-semibold">Updated</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {blogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {blog.featuredImage ? (
                          <img src={blog.featuredImage} alt="" className="w-12 h-9 object-cover rounded-md border border-gray-200" />
                        ) : (
                          <div className="w-12 h-9 rounded-md bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {(blog.title || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 max-w-xs truncate">{blog.title}</div>
                          <div className="text-xs text-gray-400">/{blog.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{blog.category?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[blog.status] || 'gray'}>{blog.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{blog.viewCount ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(blog.updatedAt || blog.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <Link href={`/blogs/${blog.id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold">Edit</Link>
                      {blog.status !== 'published' && (
                        <button onClick={() => handlePublish(blog)} className="text-green-600 hover:text-green-800">Publish</button>
                      )}
                      <button onClick={() => handleDelete(blog)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</Btn>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Btn variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</Btn>
        </div>
      )}
    </div>
  );
}
