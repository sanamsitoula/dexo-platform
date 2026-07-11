'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { blogApi } from '@/lib/api';
import { PageHeader, Btn, Badge } from '../../_ui';
import BlogForm, { BlogFormValues, EMPTY_BLOG } from '../_form';

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const subdomain = (params?.subdomain as string) || 'vrfitness';

  const [values, setValues] = useState<BlogFormValues>(EMPTY_BLOG);
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState<{ viewCount: number; likeCount: number; commentCount: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await blogApi.getById(subdomain, id);
      if (r.data) {
        const b: any = r.data;
        setValues({
          title: b.title || '',
          content: b.content || '',
          excerpt: b.excerpt || '',
          featuredImage: b.featuredImage || '',
          categoryId: b.categoryId || '',
          template: b.template || 'standard',
          tagNames: Array.isArray(b.tags) ? b.tags.map((t: any) => t.name || t.tag?.name).filter(Boolean) : [],
          metaTitle: b.metaTitle || '',
          metaDescription: b.metaDescription || '',
          status: b.status || 'draft',
        });
        setSlug(b.slug || '');
      } else if (r.error) {
        setError(r.error);
      }
      setLoading(false);
      const s = await blogApi.stats(subdomain, id);
      if (s.data) setStats(s.data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, subdomain]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    const r = await blogApi.update(subdomain, id, {
      title: values.title,
      content: values.content,
      excerpt: values.excerpt || undefined,
      featuredImage: values.featuredImage || undefined,
      categoryId: values.categoryId || undefined,
      template: values.template,
      tagNames: values.tagNames,
      metaTitle: values.metaTitle || undefined,
      metaDescription: values.metaDescription || undefined,
      status: values.status,
    });
    if (r.error) setError(r.error);
    else setSuccess('Blog updated successfully');
    setSaving(false);
  }

  async function handlePublish() {
    setSaving(true);
    const r = await blogApi.publish(subdomain, id);
    if (r.error) setError(r.error);
    else {
      setValues((v) => ({ ...v, status: 'published' }));
      setSuccess('Blog published successfully');
    }
    setSaving(false);
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading blog…</div>;

  return (
    <div>
      <PageHeader
        title="Edit Blog"
        subtitle="Update your blog post"
        action={
          <div className="flex items-center gap-3">
            {stats && (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span title="Views">👁 {stats.viewCount}</span>
                <span title="Likes">♥ {stats.likeCount}</span>
                <span title="Comments">💬 {stats.commentCount}</span>
              </div>
            )}
            <Badge color={values.status === 'published' ? 'green' : values.status === 'scheduled' ? 'indigo' : 'gray'}>
              {values.status}
            </Badge>
          </div>
        }
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      <BlogForm subdomain={subdomain} values={values} onChange={setValues} slug={slug} onSlugSuggested={setSlug} />

      <div className="flex items-center justify-end gap-3 mt-6">
        <Btn variant="ghost" onClick={() => router.push('/blogs')}>Back</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Btn>
        {values.status !== 'published' && (
          <Btn variant="outline" onClick={handlePublish} disabled={saving}>Publish</Btn>
        )}
      </div>
    </div>
  );
}
