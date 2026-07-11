'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { blogApi, blogCategoryApi, blogCommentApi } from '@/lib/api'
import RichTextEditor from '@/components/RichTextEditor'
import { TemplatePicker, TagsInput, SeoPanel } from '@/components/BlogFormParts'

export default function EditBlogPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [template, setTemplate] = useState('standard')
  const [tags, setTags] = useState<string[]>([])
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [status, setStatus] = useState('draft')
  const [slug, setSlug] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [stats, setStats] = useState<{ viewCount: number; likeCount: number; commentCount: number } | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'comments'>('content')

  useEffect(() => {
    fetchBlog()
    fetchCategories()
    fetchStats()
  }, [id])

  async function fetchBlog() {
    setLoading(true)
    const response = await blogApi.getById(id)
    if (response.data) {
      const blog = response.data
      setTitle(blog.title || '')
      setContent(blog.content || '')
      setExcerpt(blog.excerpt || '')
      setFeaturedImage(blog.featuredImage || '')
      setCategoryId(blog.categoryId || '')
      setTemplate(blog.template || 'standard')
      setTags(Array.isArray(blog.tags) ? blog.tags.map((t: any) => t.name) : [])
      setMetaTitle(blog.metaTitle || '')
      setMetaDescription(blog.metaDescription || '')
      setStatus(blog.status || 'draft')
      setSlug(blog.slug || '')

      if (blog.comments) {
        setComments(blog.comments)
      } else {
        fetchComments()
      }
    } else if (response.error) {
      setError(response.error)
    }
    setLoading(false)
  }

  async function fetchStats() {
    const response = await blogApi.stats(id)
    if (response.data) setStats(response.data)
  }

  async function fetchComments() {
    const response = await blogCommentApi.listByBlog(id)
    if (response.data) {
      setComments(Array.isArray(response.data) ? response.data : [])
    }
  }

  async function fetchCategories() {
    const response = await blogCategoryApi.list()
    if (response.data) {
      setCategories(Array.isArray(response.data) ? response.data : [])
    }
  }

  async function handleSuggestSlug() {
    if (!title) return
    setSuggesting(true)
    const response = await blogApi.suggestSlug(title)
    if (response.data?.slug) setSlug(response.data.slug)
    setSuggesting(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const data = {
      title,
      content,
      excerpt: excerpt || undefined,
      featuredImage: featuredImage || undefined,
      categoryId: categoryId || undefined,
      template,
      tagNames: tags,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      status,
    }

    const response = await blogApi.update(id, data)
    if (response.error) {
      setError(response.error)
    } else {
      setSuccess('Blog updated successfully')
    }
    setSaving(false)
  }

  async function handlePublish() {
    setSaving(true)
    const response = await blogApi.publish(id)
    if (response.error) {
      setError(response.error)
    } else {
      setStatus('published')
      setSuccess('Blog published successfully')
    }
    setSaving(false)
  }

  async function handleCommentStatus(commentId: string, newStatus: string) {
    const response = await blogCommentApi.updateStatus(commentId, newStatus)
    if (!response.error) {
      fetchComments()
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment?')) return
    const response = await blogCommentApi.delete(commentId)
    if (!response.error) {
      fetchComments()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading blog...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Blog</h1>
          <p className="mt-2 text-gray-600">Update blog post</p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span title="Views">👁 {stats.viewCount}</span>
              <span title="Likes">♥ {stats.likeCount}</span>
              <span title="Comments">💬 {stats.commentCount}</span>
            </div>
          )}
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            status === 'published' ? 'bg-green-100 text-green-800' :
            status === 'draft' ? 'bg-gray-100 text-gray-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {status}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['content', 'seo', 'comments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'comments' ? `Comments (${comments.length})` : tab === 'seo' ? 'SEO' : 'Content'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'content' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                className="input-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>

            <TemplatePicker value={template} onChange={setTemplate} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL</label>
              <input
                type="url"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className="input-primary"
              />
              {featuredImage && (
                <img src={featuredImage} alt="Preview" className="mt-2 h-32 object-cover rounded" />
              )}
            </div>

            <TagsInput tags={tags} onChange={setTags} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-primary"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/blogs')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {status !== 'published' && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="btn-primary bg-green-600 hover:bg-green-700"
              >
                Publish
              </button>
            )}
          </div>
        </form>
      )}

      {activeTab === 'seo' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <SeoPanel
            title={title}
            metaTitle={metaTitle}
            setMetaTitle={setMetaTitle}
            metaDescription={metaDescription}
            setMetaDescription={setMetaDescription}
            excerpt={excerpt}
            slug={slug}
            onSuggestSlug={handleSuggestSlug}
            suggesting={suggesting}
          />
          <button
            onClick={handleSubmit as any}
            disabled={saving}
            className="btn-primary"
          >
            Save SEO Settings
          </button>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="bg-white rounded-lg shadow p-6">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No comments yet</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {comment.author?.firstName || comment.guestName || 'Anonymous'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      comment.status === 'approved' ? 'bg-green-100 text-green-800' :
                      comment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {comment.status}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-700">{comment.content}</p>
                  <div className="mt-3 flex gap-2">
                    {comment.status !== 'approved' && (
                      <button
                        onClick={() => handleCommentStatus(comment.id, 'approved')}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        Approve
                      </button>
                    )}
                    {comment.status !== 'rejected' && (
                      <button
                        onClick={() => handleCommentStatus(comment.id, 'rejected')}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
