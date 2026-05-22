import type { CommercePlacementKey, PageType, ProductType } from './types';

export interface PlacementRule {
  key: CommercePlacementKey;
  pageType: PageType;
  defaultLimit: number;
  variant: 'rail' | 'grid' | 'inline' | 'bundle';
  requireImage: boolean;
  allowMerch: boolean;
  maxPerMerchant: number;
  allowedTypes?: ProductType[];
  excludedTypes?: ProductType[];
  title: string;
  eyebrow?: string;
  description?: string;
}

export const PLACEMENT_RULES: Record<CommercePlacementKey, PlacementRule> = {
  'homepage-rail': {
    key: 'homepage-rail',
    pageType: 'home',
    defaultLimit: 6,
    variant: 'rail',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown', 'service'],
    title: 'Helpful picks for dog parents',
    eyebrow: 'Partner picks',
    description: 'Useful products that fit common dog-parent needs.',
  },
  'category-primary': {
    key: 'category-primary',
    pageType: 'category',
    defaultLimit: 4,
    variant: 'rail',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown'],
    title: 'Helpful products for this topic',
    eyebrow: 'Partner picks',
  },
  'category-secondary': {
    key: 'category-secondary',
    pageType: 'category',
    defaultLimit: 4,
    variant: 'rail',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown'],
    title: 'More useful options',
  },
  'article-inline': {
    key: 'article-inline',
    pageType: 'guide',
    defaultLimit: 2,
    variant: 'inline',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown'],
    title: 'Useful option',
  },
  'article-end': {
    key: 'article-end',
    pageType: 'guide',
    defaultLimit: 4,
    variant: 'rail',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown'],
    title: 'Helpful products for this guide',
    eyebrow: 'Partner picks',
  },
  'breed-care': {
    key: 'breed-care',
    pageType: 'breed',
    defaultLimit: 3,
    variant: 'rail',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown', 'service'],
    title: 'Useful care picks for this breed',
    eyebrow: 'Practical options',
  },
  'brand-grid': {
    key: 'brand-grid',
    pageType: 'brand',
    defaultLimit: 24,
    variant: 'grid',
    requireImage: true,
    allowMerch: true,
    maxPerMerchant: 999,
    title: 'Products from this partner',
    eyebrow: 'Partner catalog',
  },
  'brand-page-secondary': {
    key: 'brand-page-secondary',
    pageType: 'brand',
    defaultLimit: 8,
    variant: 'rail',
    requireImage: true,
    allowMerch: true,
    maxPerMerchant: 999,
    title: 'More from this partner',
  },
  'review-rail': {
    key: 'review-rail',
    pageType: 'review',
    defaultLimit: 4,
    variant: 'rail',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown'],
    title: 'Compare related options',
  },
  'tool-context': {
    key: 'tool-context',
    pageType: 'tool',
    defaultLimit: 3,
    variant: 'rail',
    requireImage: true,
    allowMerch: false,
    maxPerMerchant: 1,
    excludedTypes: ['brand-merch', 'unknown'],
    title: 'Useful products for this result',
  },
};

export function getPlacementRule(placement: string): PlacementRule | undefined {
  return PLACEMENT_RULES[placement as CommercePlacementKey];
}
