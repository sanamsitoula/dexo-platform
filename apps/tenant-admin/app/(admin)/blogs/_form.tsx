'use client';

import { useEffect, useState } from 'react';
import { blogApi, blogCategoryApi } from '@/lib/api';
import RichTextEditor from '@/components/RichTextEditor';
import { Card, Btn, Field, Input } from '../_ui';

const TEMPLATES = [
  { key: 'standard', name: 'Standard', desc: 'Classic article layout' },
  { key: 'feature', name: 'Feature', desc: 'Full-width hero image' },
  { key: 'minimal', name: 'Minimal', desc: 'Narrow centered column' },
];

const TEMPLATE_PREVIEWS: Record<string, string[]> = {
  standard: ['w-2/3 h-2 bg-gray-300', 'w-full h-8 bg-gray-200', 'w-full h-1.5 bg-gray-300', 'w-5/6 h-1.5 bg-gray-300'],
  feature: ['w-full h-10 bg-indigo-200', 'w-1/2 h-2 bg-gray-300 mx-auto', 'w-full h-1.5 bg-gray-300'],
  minimal: ['w-1/2 h-2 bg-gray-300 mx-auto', 'w-2/3 h-1.5 bg-gray-300 mx-auto', 'w-2/3 h-1.5 bg-gray-300 mx-auto'],
};

export interface BlogFormValues {
  title: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  categoryId: string;
  template: string;
  tagNames: string[];
  metaTitle: string;
  metaDescription: string;
  status: string;
}

export const EMPTY_BLOG: BlogFormValues = {
  title: '',
  content: '',
  excerpt: '',
  featuredImage: '',
  categoryId: '',
  template: 'standard',
  tagNames: [],
  metaTitle: '',
  metaDescription: '',
  status: 'draft',
};

export default function BlogForm({
  subdomain,
  values,
  onChange,
  slug,
  onSlugSuggested,
}: {
  subdomain: string;
  values: BlogFormValues;
  onChange: (v: BlogFormValues) => void;
  slug?: string;
  onSlugSuggested?: (slug: string) => void;
}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    blogCategoryApi.list(subdomain).then((r) => {
      if (r.data) setCategories(Array.isArray(r.data) ? r.data : []);
    });
  }, [subdomain]);

  function set<K extends keyof BlogFormValues>(key: K, value: BlogFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, '');
    if (tag && !values.tagNames.includes(tag)) set('tagNames', [...values.tagNames, tag]);
    setTagInput('');
  }

  async function suggestSlug() {
    if (!values.title) return;
    setSuggesting(true);
    const r = await blogApi.suggestSlug(subdomain, values.title);
    if (r.data?.slug && onSlugSuggested) onSlugSuggested(r.data.slug);
    setSuggesting(false);
  }

  const titleLen = (values.metaTitle || values.title).length;
  const descLen = (values.metaDescription || values.excerpt).length;
  const previewSlug = slug || values.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || '…';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Field label="Title *">
          <Input value={values.title} onChange={(e: any) => set('title', e.target.value)} placeholder="Enter blog title" />
        </Field>
        <Field label="Excerpt">
          <textarea
            value={values.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
            rows={2}
            placeholder="Short summary"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Content *">
          <RichTextEditor value={values.content} onChange={(html) => set('content', html)} />
        </Field>

        <Field label="Template">
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => set('template', t.key)}
                className={`text-left border-2 rounded-lg p-3 transition ${values.template === t.key ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="space-y-1 mb-2 bg-white border border-gray-100 rounded p-2">
                  {TEMPLATE_PREVIEWS[t.key].map((cls, i) => (
                    <div key={i} className={`rounded-sm ${cls}`} />
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-500">{t.desc}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Featured Image URL">
          <Input value={values.featuredImage} onChange={(e: any) => set('featuredImage', e.target.value)} placeholder="https://example.com/image.jpg" />
        </Field>
        {values.featuredImage && (
          <img src={values.featuredImage} alt="Preview" className="h-32 object-cover rounded-lg mb-4 -mt-2" />
        )}

        <Field label="Tags">
          <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
            {values.tagNames.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded-full">
                {tag}
                <button type="button" onClick={() => set('tagNames', values.tagNames.filter((t) => t !== tag))} className="hover:text-indigo-900">×</button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                else if (e.key === 'Backspace' && !tagInput && values.tagNames.length) set('tagNames', values.tagNames.slice(0, -1));
              }}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
              placeholder={values.tagNames.length ? '' : 'Type a tag and press Enter'}
              className="flex-1 min-w-[140px] text-sm py-1 px-1 outline-none"
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select
              value={values.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={values.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">SEO</h3>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700">Meta Title</span>
          <span className={`text-xs ${titleLen > 60 ? 'text-red-500' : 'text-gray-400'}`}>{titleLen}/60</span>
        </div>
        <Input value={values.metaTitle} onChange={(e: any) => set('metaTitle', e.target.value)} placeholder="SEO title (defaults to blog title)" />
        <div className="flex items-center justify-between mb-1 mt-4">
          <span className="text-sm font-semibold text-gray-700">Meta Description</span>
          <span className={`text-xs ${descLen > 160 ? 'text-red-500' : 'text-gray-400'}`}>{descLen}/160</span>
        </div>
        <textarea
          value={values.metaDescription}
          onChange={(e) => set('metaDescription', e.target.value)}
          rows={2}
          placeholder="SEO description (defaults to excerpt)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2 mt-4">
          <Btn variant="ghost" onClick={suggestSlug} disabled={suggesting || !values.title}>
            {suggesting ? 'Suggesting…' : '✨ AI Slug'}
          </Btn>
          {slug && <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">/{slug}</code>}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Google snippet preview</p>
          <p className="text-blue-700 text-lg leading-snug truncate">{values.metaTitle || values.title || 'Blog title'}</p>
          <p className="text-green-700 text-sm">{subdomain}.onedexo.com/blog/{previewSlug}</p>
          <p className="text-gray-600 text-sm line-clamp-2">{values.metaDescription || values.excerpt || 'No description provided.'}</p>
        </div>
      </Card>
    </div>
  );
}
