// Meilisearch — typo-tolerant instant search
// ============================================
// Uses the search-only key (safe to expose). Admin key stays server-side
// (used by the sync edge function).

import { Meilisearch as MeiliSearch, type Hits } from "meilisearch";

const MEILI_HOST = import.meta.env.VITE_MEILI_HOST as string | undefined;
const MEILI_SEARCH_KEY = import.meta.env.VITE_MEILI_SEARCH_KEY as string | undefined;

export const meili: MeiliSearch | null =
  MEILI_HOST && MEILI_SEARCH_KEY
    ? new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_SEARCH_KEY })
    : null;

export interface ProductHit {
  id: string;
  sku: string;
  slug: string;
  name_tr: string;
  name_de: string;
  name_en: string;
  brand_name?: string;
  category_name?: string;
  price: number;
  currency: string;
  image?: string;
  energy_rating?: string;
}

export interface SearchParams {
  query: string;
  locale?: "tr" | "de" | "en" | "fr" | "nl";
  filters?: string[];
  facets?: string[];
  limit?: number;
  offset?: number;
}

export async function searchProducts(params: SearchParams): Promise<{
  hits: Hits<ProductHit>;
  total: number;
  facets?: Record<string, Record<string, number>>;
}> {
  if (!meili) return { hits: [] as unknown as Hits<ProductHit>, total: 0 };

  const index = meili.index<ProductHit>("products");
  const result = await index.search(params.query, {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    filter: params.filters,
    facets: params.facets,
    attributesToHighlight: [`name_${params.locale ?? "tr"}`],
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>",
  });

  return {
    hits: result.hits,
    total: result.estimatedTotalHits ?? 0,
    facets: result.facetDistribution,
  };
}
