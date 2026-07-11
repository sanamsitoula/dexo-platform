'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { blogApi } from '@/lib/api'

function Meta({ blog, className = '' }: { blog: any; className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      {blog.author && (
        <span className="font-medium">
          {[blog.author.firstName, blog.author.lastName].filter(Boolean).join(' ') || 'Dexo Team'}
        </span>
      )}
      <span>·</span>
      <span>{new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      <span>·</span>
      <span>👁 {blog.viewCount ?? 0} views</span>
    </div>
  )
}

function Tags({ blog }: { blog: any }) {
  const tags: any[] = Array.isArray(blog.tags) ? blog.tags : []
  if (!tags.length) return null
  return (
    <div className="flex flex-wrap gap-2 mt-8">
      {tags.map((t: any) => {
        const name = t.name || t.tag?.name
        return name ? (
          <span key={name} className="px-3 py-1 bg-white/5 border border-white/10 text-cyan-300 text-xs font-semibold rounded-full">
            #{name}
          </span>
        ) : null
      })}
    </div>
  )
}

export default function BlogDetailPage() {
  const slug = useParams()?.slug as string
  const [blog, setBlog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    blogApi.getBySlug(slug).then((r) => {
      if (r.data) setBlog(r.data)
      else setError(r.error || 'Blog not found')
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050a]">
        <div className="max-w-3xl mx-auto px-4 py-20 animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/3" />
          <div className="h-64 bg-white/5 rounded" />
        </div>
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-[#05050a]">
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white">Post not found</h1>
          <p className="mt-2 text-zinc-400">{error || 'This blog post does not exist or is not published.'}</p>
          <Link href="/blog" className="inline-block mt-6 text-cyan-400 font-semibold hover:text-cyan-300">← Back to blog</Link>
        </div>
      </div>
    )
  }

  const template = blog.template || 'standard'
  const content = <div className="prose-dark mt-8" dangerouslySetInnerHTML={{ __html: blog.content || '' }} />

  if (template === 'feature') {
    return (
      <article className="bg-[#05050a] min-h-screen">
        <div className="relative">
          {blog.featuredImage ? (
            <img src={blog.featuredImage} alt={blog.title} className="w-full h-[420px] object-cover" />
          ) : (
            <div className="w-full h-[420px] bg-gradient-to-br from-indigo-600 via-violet-600 to-[#05050a]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-black/50 to-black/20 flex items-end">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-12">
              {blog.category?.name && (
                <span className="inline-block px-3 py-1 bg-white/10 border border-white/20 backdrop-blur text-cyan-300 text-xs font-semibold rounded-full mb-4 uppercase tracking-wide">
                  {blog.category.name}
                </span>
              )}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight"
                style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
              >
                {blog.title}
              </h1>
              <Meta blog={blog} className="text-zinc-300 mt-4" />
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          {blog.excerpt && <p className="text-xl text-zinc-300 leading-relaxed">{blog.excerpt}</p>}
          {content}
          <Tags blog={blog} />
          <Link href="/blog" className="inline-block mt-10 text-cyan-400 font-semibold hover:text-cyan-300">← Back to blog</Link>
        </div>
      </article>
    )
  }

  if (template === 'minimal') {
    return (
      <article className="bg-[#05050a] min-h-screen">
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <h1
            className="text-3xl font-bold text-white leading-snug"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            {blog.title}
          </h1>
          <Meta blog={blog} className="text-zinc-500 mt-4 justify-center" />
          <div className="text-left">
            {content}
            <Tags blog={blog} />
          </div>
          <Link href="/blog" className="inline-block mt-10 text-cyan-400 font-semibold hover:text-cyan-300">← Back to blog</Link>
        </div>
      </article>
    )
  }

  // standard: classic article layout
  return (
    <article className="bg-[#05050a] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {blog.category?.name && (
          <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">{blog.category.name}</span>
        )}
        <h1
          className="text-4xl font-bold text-white mt-2 leading-tight"
          style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
        >
          {blog.title}
        </h1>
        <Meta blog={blog} className="text-zinc-500 mt-4" />
        {blog.featuredImage && (
          <img src={blog.featuredImage} alt={blog.title} className="w-full h-80 object-cover rounded-xl mt-8 border border-white/10" />
        )}
        {blog.excerpt && <p className="text-lg text-zinc-300 mt-8 leading-relaxed border-l-4 border-violet-500/40 pl-4">{blog.excerpt}</p>}
        {content}
        <Tags blog={blog} />
        <Link href="/blog" className="inline-block mt-10 text-cyan-400 font-semibold hover:text-cyan-300">← Back to blog</Link>
      </div>
    </article>
  )
}
