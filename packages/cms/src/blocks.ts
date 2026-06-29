export type ContentBlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'gallery'
  | 'cta'
  | 'testimonials'
  | 'pricing'
  | 'features'
  | 'contact';

export interface ContentBlock<TConfig = Record<string, unknown>> {
  id: string;
  type: ContentBlockType;
  order: number;
  config: TConfig;
}

export interface HeroBlockConfig {
  headline: string;
  subheadline?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}
