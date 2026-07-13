'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { blogApi } from '@/lib/api';
import { PageHeader, Btn } from '../../_ui';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import BlogForm, { BlogFormValues, EMPTY_BLOG } from '../_form';

export default function NewBlogPage() {
  const router = useRouter();
  const subdomain = resolveTenantAdminSubdomain();
  const [values, setValues] = useState<BlogFormValues>(EMPTY_BLOG);
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(publishNow = false) {
    if (!values.title.trim()) { setError('Title is required'); return; }
    if (!values.content || !values.content.replace(/<[^>]*>/g, '').trim()) { setError('Content is required'); return; }
    setSaving(true);
    setError('');
    const r = await blogApi.create(subdomain, {
      title: values.title,
      content: values.content,
      excerpt: values.excerpt || undefined,
      featuredImage: values.featuredImage || undefined,
      categoryId: values.categoryId || undefined,
      template: values.template,
      tagNames: values.tagNames.length ? values.tagNames : undefined,
      metaTitle: values.metaTitle || undefined,
      metaDescription: values.metaDescription || undefined,
      status: publishNow ? 'published' : values.status,
    });
    if (r.error) setError(r.error);
    else router.push('/blogs');
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="Create Blog" subtitle="Write a new blog post for your website" />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <BlogForm subdomain={subdomain} values={values} onChange={setValues} slug={slug} onSlugSuggested={setSlug} />

      <div className="flex items-center justify-end gap-3 mt-6">
        <Btn variant="ghost" onClick={() => router.push('/blogs')}>Cancel</Btn>
        <Btn variant="outline" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? 'Saving…' : 'Save as Draft'}
        </Btn>
        <Btn onClick={() => handleSave(true)} disabled={saving}>
          {saving ? 'Publishing…' : 'Publish Now'}
        </Btn>
      </div>
    </div>
  );
}
