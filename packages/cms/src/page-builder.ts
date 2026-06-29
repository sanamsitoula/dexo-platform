import type { ContentBlock } from './blocks';

export interface Page {
  id: string;
  slug: string;
  title: string;
  blocks: ContentBlock[];
  published: boolean;
  updatedAt: string;
}

export const emptyPage = (slug: string, title: string): Page => ({
  id: '',
  slug,
  title,
  blocks: [],
  published: false,
  updatedAt: new Date().toISOString(),
});
