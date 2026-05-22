export type ProductType =
  | 'food'
  | 'treats'
  | 'supplement'
  | 'toy'
  | 'grooming'
  | 'bed'
  | 'crate'
  | 'training'
  | 'walking'
  | 'travel'
  | 'cleaning'
  | 'health-care'
  | 'brand-merch'
  | 'service'
  | 'unknown';

export type CommercialIntent = 'high' | 'medium' | 'low';

export type PageType = 'home' | 'category' | 'guide' | 'breed' | 'brand' | 'review' | 'tool';

export type CommerceVariant = 'rail' | 'grid' | 'inline' | 'bundle';

export type CommercePlacementKey =
  | 'homepage-rail'
  | 'category-primary'
  | 'category-secondary'
  | 'article-inline'
  | 'article-end'
  | 'breed-care'
  | 'brand-grid'
  | 'brand-page-secondary'
  | 'review-rail'
  | 'tool-context';

export interface RawAwinProduct {
  [key: string]: unknown;
  id?: string;
  name?: string;
  description?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  image?: string;
  merchant?: string;
  category?: string;
  topicTags?: string[];
  availability?: string;
  source?: string;
  syncedAt?: string;
}

export interface NormalizedAwinProduct {
  id: string;
  awProductId: string;
  merchantProductId?: string;
  name: string;
  description: string;
  price?: number;
  currency?: string;
  url: string;
  image?: string;
  merchant: string;
  category?: string;
  advertiserId?: string;
  programId?: string;
  topicTags: string[];
  availability?: string;
  source?: string;
  syncedAt?: string;

  normalizedName: string;
  normalizedType: ProductType;
  commercialIntent: CommercialIntent;
  contentFit: string[];
  allowedPlacements: CommercePlacementKey[];
  excludedPlacements: CommercePlacementKey[];
  qualityScore: number;
  merchantPriority: number;
  warnings: string[];
}

export interface CommerceContext {
  pageType: PageType;
  placement: CommercePlacementKey | string;
  title?: string;
  category?: string;
  tags?: string[];
  merchant?: string;
  programId?: string;
  breedName?: string;
  breedSize?: string;
  coatType?: string;
  groomingNeeds?: string;
  energyLevel?: string;
  lifeStage?: string;
  [key: string]: unknown;
}

export interface ScoredCommerceProduct extends NormalizedAwinProduct {
  score: number;
  scoreBreakdown: {
    relevance: number;
    quality: number;
    merchantPriority: number;
    conversionIntent: number;
    diversity: number;
    mismatchPenalty: number;
  };
}
