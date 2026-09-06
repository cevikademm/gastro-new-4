/**
 * Ratgeber (Almanca rehber) içerik motoru — tipler.
 * Kaynak: src/content/ratgeber/*.md (frontmatter + Markdown)
 * Build:  scripts/seo/build-ratgeber-index.ts → index.generated.ts
 */
export type RatgeberCategory = 'kaufberatung' | 'planung' | 'hygiene-haccp' | 'technik' | 'recht-foerderung' | 'news';
export type RatgeberStatus = 'draft' | 'review' | 'published';

export interface RatgeberMeta {
  slug: string;
  title: string;
  description: string;
  locale: 'de';
  category: RatgeberCategory;
  tags: string[];
  author: string;
  datePublished: string;
  dateModified: string;
  image: string;
  imageAlt: string;
  status: RatgeberStatus;
  faq: Array<{ q: string; a: string }>;
  relatedCategories: string[];
  relatedProducts: string[];
  sources: Array<{ title: string; url: string; publisher?: string }>;
  readingMinutes: number;
  wordCount: number;
}

export interface RatgeberEntry extends RatgeberMeta {
  /** Sanitize edilmiş HTML gövde. */
  html: string;
  /** İlk paragraf (özet). */
  excerpt: string;
  toc: Array<{ id: string; text: string; level: 2 | 3 }>;
}

export const RATGEBER_CATEGORY_LABEL: Record<RatgeberCategory, string> = {
  kaufberatung: 'Kaufberatung',
  planung: 'Küchenplanung',
  'hygiene-haccp': 'Hygiene & HACCP',
  technik: 'Technik & Betrieb',
  'recht-foerderung': 'Recht & Förderung',
  news: 'Neuigkeiten',
};
