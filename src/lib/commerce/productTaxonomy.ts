import type { CommercePlacementKey, ProductType } from './types';

export const MERCH_KEYWORDS = [
  'cap',
  'hat',
  'trucker',
  'shirt',
  't-shirt',
  'tee',
  'hoodie',
  'sweatshirt',
  'mug',
  'sticker',
  'tote',
  'poster',
  'beanie',
];

export const PRODUCT_TYPE_KEYWORDS: Record<ProductType, string[]> = {
  food: ['food', 'meal', 'kibble', 'broth', 'topper', 'recipe', 'fresh food'],
  treats: ['treat', 'chew', 'jerky', 'biscuit', 'cookie'],
  supplement: ['supplement', 'joint', 'probiotic', 'omega', 'vitamin', 'hip', 'mobility', 'calming'],
  toy: ['toy', 'ball', 'rope', 'plush', 'squeaky', 'puzzle', 'enrichment'],
  grooming: ['grooming', 'brush', 'comb', 'shampoo', 'conditioner', 'nail', 'dryer', 'deshedding'],
  bed: ['bed', 'mattress', 'blanket', 'orthopedic'],
  crate: ['crate', 'kennel', 'pen', 'gate'],
  training: ['training', 'clicker', 'whistle', 'reward', 'muzzle'],
  walking: ['leash', 'harness', 'collar', 'lead', 'poop bag'],
  travel: ['carrier', 'travel', 'car seat', 'seat belt', 'backpack'],
  cleaning: ['cleaner', 'odor', 'stain', 'pee', 'wipes', 'waste'],
  'health-care': ['health', 'care', 'wound', 'dental', 'toothbrush', 'ear cleaner'],
  'brand-merch': MERCH_KEYWORDS,
  service: ['subscription', 'membership', 'service', 'insurance'],
  unknown: [],
};

export const TYPE_TO_CONTENT_FIT: Record<ProductType, string[]> = {
  food: ['nutrition', 'food', 'feeding', 'puppy', 'senior', 'hydration'],
  treats: ['training', 'treats', 'enrichment', 'puppy'],
  supplement: ['joint-health', 'senior', 'recovery', 'calming', 'digestion'],
  toy: ['enrichment', 'training', 'exercise', 'puppy'],
  grooming: ['grooming', 'coat-care', 'shedding', 'hygiene'],
  bed: ['comfort', 'sleep', 'large-dog', 'senior'],
  crate: ['puppy', 'training', 'home-setup', 'travel'],
  training: ['training', 'behavior', 'puppy'],
  walking: ['walking', 'outdoor', 'training', 'safety'],
  travel: ['travel', 'outdoor', 'safety'],
  cleaning: ['cleaning', 'puppy', 'home-care'],
  'health-care': ['health', 'care', 'hygiene'],
  'brand-merch': ['brand', 'merch'],
  service: ['services', 'insurance', 'membership'],
  unknown: [],
};

export const MERCH_EXCLUDED_PLACEMENTS: CommercePlacementKey[] = [
  'homepage-rail',
  'category-primary',
  'category-secondary',
  'article-inline',
  'article-end',
  'breed-care',
  'review-rail',
  'tool-context',
];

export const MERCH_ALLOWED_PLACEMENTS: CommercePlacementKey[] = ['brand-grid', 'brand-page-secondary'];

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsAnyKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  const wordSet = new Set(normalized.split(' '));
  return keywords.some((keyword) => {
    const normKw = normalizeText(keyword);
    // Multi-word keywords use substring match; single words require exact word boundary
    if (normKw.includes(' ')) return normalized.includes(normKw);
    return wordSet.has(normKw);
  });
}
