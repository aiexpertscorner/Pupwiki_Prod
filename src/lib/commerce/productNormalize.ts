import type {
  CommercialIntent,
  CommercePlacementKey,
  NormalizedAwinProduct,
  ProductType,
  RawAwinProduct,
} from './types';
import {
  containsAnyKeyword,
  MERCH_ALLOWED_PLACEMENTS,
  MERCH_EXCLUDED_PLACEMENTS,
  PRODUCT_TYPE_KEYWORDS,
  TYPE_TO_CONTENT_FIT,
  normalizeText,
} from './productTaxonomy';

function firstString(product: RawAwinProduct, keys: string[]): string {
  for (const key of keys) {
    const value = product[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => normalizeText(item)).filter(Boolean))];
}

export function detectProductType(product: RawAwinProduct): ProductType {
  // Merch detection runs only on name to avoid false positives from descriptions
  // (e.g. "cap locks", "poster board", "tote capacity" in product descriptions)
  const nameOnly = normalizeText(String(product.name ?? ''));
  if (containsAnyKeyword(nameOnly, PRODUCT_TYPE_KEYWORDS['brand-merch'])) return 'brand-merch';

  const text = normalizeText(
    [
      product.name,
      product.description,
      product.category,
      Array.isArray(product.topicTags) ? product.topicTags.join(' ') : '',
    ].join(' '),
  );

  const candidates: ProductType[] = [
    'food',
    'treats',
    'supplement',
    'toy',
    'grooming',
    'bed',
    'crate',
    'training',
    'walking',
    'travel',
    'cleaning',
    'health-care',
    'service',
  ];

  for (const type of candidates) {
    if (containsAnyKeyword(text, PRODUCT_TYPE_KEYWORDS[type])) return type;
  }

  return 'unknown';
}

export function getCommercialIntent(
  type: ProductType,
  hasImage: boolean,
  hasUrl: boolean,
): CommercialIntent {
  if (!hasUrl) return 'low';
  if (type === 'brand-merch' || type === 'unknown') return 'low';
  if (!hasImage) return 'medium';
  if (
    ['food', 'treats', 'toy', 'grooming', 'bed', 'crate', 'training', 'walking', 'travel', 'cleaning'].includes(type)
  ) {
    return 'high';
  }
  return 'medium';
}

export function getAllowedPlacements(type: ProductType): CommercePlacementKey[] {
  if (type === 'brand-merch') return MERCH_ALLOWED_PLACEMENTS;
  return [
    'homepage-rail',
    'category-primary',
    'category-secondary',
    'article-inline',
    'article-end',
    'breed-care',
    'brand-grid',
    'brand-page-secondary',
    'review-rail',
    'tool-context',
  ];
}

export function getExcludedPlacements(type: ProductType): CommercePlacementKey[] {
  if (type === 'brand-merch') return MERCH_EXCLUDED_PLACEMENTS;
  return [];
}

export function computeQualityScore(product: {
  url: string;
  image?: string;
  name: string;
  description: string;
  price?: number;
  currency?: string;
  merchant: string;
  syncedAt?: string;
}): number {
  let score = 0;
  if (product.url) score += 25;
  if (product.image) score += 25;
  if (product.name.length >= 4) score += 10;
  if (product.description.length >= 20) score += 10;
  if (typeof product.price === 'number') score += 10;
  if (product.currency) score += 5;
  if (product.merchant) score += 10;
  if (product.syncedAt) score += 5;
  return Math.min(score, 100);
}

export function normalizeAwinProduct(product: RawAwinProduct, index = 0): NormalizedAwinProduct {
  const name = firstString(product, ['name']);
  const description = firstString(product, ['description']);
  const url = firstString(product, ['url', 'deepLink', 'clickUrl']);
  const image = firstString(product, ['image', 'imageUrl', 'image_url']);
  const merchant = firstString(product, ['merchant', 'advertiserName', 'programName']);
  const awProductId = firstString(product, ['awProductId', 'awProductld', 'awProductID', 'aw_product_id']);
  const merchantProductId = firstString(product, ['merchantProductId', 'merchantProductld', 'merchantProductID']);
  const advertiserId = firstString(product, ['advertiserId', 'advertiserld', 'advertiserID']);
  const programId = firstString(product, ['programId', 'programld', 'programID']);
  const category = firstString(product, ['category']);
  const topicTags = normalizeTags(product.topicTags);
  const price = parsePrice(product.price);
  const currency = firstString(product, ['currency']);
  const syncedAt = firstString(product, ['syncedAt']);
  const availability = firstString(product, ['availability']);

  const normalizedType = detectProductType(product);
  const normalizedName = normalizeText(name);
  const hasUrl = Boolean(url);
  const hasImage = Boolean(image);
  const qualityScore = computeQualityScore({ url, image, name, description, price, currency, merchant, syncedAt });
  const warnings: string[] = [];

  if (!hasUrl) warnings.push('missing-url');
  if (!hasImage) warnings.push('missing-image');
  if (!merchant) warnings.push('missing-merchant');
  if (!price) warnings.push('missing-price');
  if (!availability) warnings.push('unknown-availability');
  if (normalizedType === 'brand-merch') warnings.push('brand-merch');

  return {
    id:
      firstString(product, ['id']) ||
      `${programId || merchant || 'awin'}-${awProductId || merchantProductId || index}`,
    awProductId,
    merchantProductId,
    name,
    description,
    price,
    currency,
    url,
    image,
    merchant,
    category,
    advertiserId,
    programId,
    topicTags,
    availability,
    source: firstString(product, ['source']),
    syncedAt,
    normalizedName,
    normalizedType,
    commercialIntent: getCommercialIntent(normalizedType, hasImage, hasUrl),
    contentFit: [...new Set([...(TYPE_TO_CONTENT_FIT[normalizedType] || []), ...topicTags])],
    allowedPlacements: getAllowedPlacements(normalizedType),
    excludedPlacements: getExcludedPlacements(normalizedType),
    qualityScore,
    merchantPriority: 50,
    warnings,
  };
}

export function getProductDedupeKey(product: NormalizedAwinProduct): string {
  return [
    product.merchant,
    product.normalizedName,
    product.merchantProductId || product.awProductId || product.image,
  ].join('|');
}

export function dedupeProducts(products: NormalizedAwinProduct[]): NormalizedAwinProduct[] {
  const seen = new Set<string>();
  const output: NormalizedAwinProduct[] = [];

  for (const product of products) {
    const key = getProductDedupeKey(product);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(product);
  }

  return output;
}
