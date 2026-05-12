/**
 * Adapts product-index.json entries to the AmazonProductRecord interface
 * used by the existing slot/matching pipeline, plus a richer extended type
 * for the enhanced product card display.
 */

import { AMAZON_ASSOCIATE_TAG } from './amazonConfig';
import { buildAmazonSearchUrl } from './amazonDeeplink';
import type { AmazonPlacementContext, AmazonProductRecord } from './amazonTypes';

// ─── extended type ────────────────────────────────────────────────────────────

export type RichAmazonProductRecord = AmazonProductRecord & {
  /** PupWiki editorial score 0–10 */
  editorialScore?: number;
  rating?: number;
  reviewCount?: number;
  price?: number;
  priceUpdated?: string;
  features?: string[];
  pros?: string[];
  cons?: string[];
  verdict?: string;
  /** CDN or local image URL */
  productImage?: string;
  breedSizeFit?: string[];
  healthFocus?: string[];
  lifeStage?: string[];
  energyLevelFit?: string[];
};

// ─── raw product-index schema ─────────────────────────────────────────────────

export type ProductIndexEntry = {
  id: string;
  name: string;
  brand?: string;
  asin?: string;
  price?: number;
  price_updated?: string;
  rating?: number;
  reviewCount?: number;
  image?: string;
  local_image?: string;
  category?: string;
  category_key?: string;
  subcategory?: string;
  breed_size_fit?: string[];
  life_stage?: string[];
  health_focus?: string[];
  energy_level_fit?: string[];
  features?: string[];
  pros?: string[];
  cons?: string[];
  verdict?: string;
  score?: number;
  tags?: string[];
  search_volume?: number;
  active?: boolean;
};

// ─── adapter ──────────────────────────────────────────────────────────────────

export function adaptProductIndexEntry(p: ProductIndexEntry): RichAmazonProductRecord {
  const asin = p.asin?.trim() || '';
  const affiliateUrl = asin
    ? `https://www.amazon.com/dp/${asin}?tag=${AMAZON_ASSOCIATE_TAG}`
    : buildAmazonSearchUrl(p.name + ' ' + (p.brand || '') + ' dog', AMAZON_ASSOCIATE_TAG);

  const allTags = [
    ...(p.tags ?? []),
    ...(p.health_focus ?? []),
    ...(p.breed_size_fit ?? []),
    ...(p.life_stage ?? []),
    p.category,
    p.subcategory,
  ].filter((t): t is string => Boolean(t));

  const priorityScore = p.score != null ? Math.round(p.score * 10) : 50;
  const salesIntent =
    (p.search_volume ?? 0) > 8000 ? 'high'
    : (p.search_volume ?? 0) > 2000 ? 'medium'
    : 'low';

  return {
    // Core AmazonProductRecord fields
    id: p.id,
    enabled: p.active !== false,
    name: p.name,
    brand: p.brand,
    asin,
    amazonAffiliateUrl: affiliateUrl,
    amazonSearchQuery: p.name,
    categoryGroup: p.category_key || p.category || 'dog-supplies',
    categoryLabel: p.subcategory
      ? (p.subcategory.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      : (p.category?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Dog Supplies'),
    topicTags: allTags,
    targetPageSlugs: ['/breeds/[breed]', `/categories/${p.category ?? 'dog-supplies'}`],
    complianceRisk: 'low',
    priorityScore,
    salesIntent,
    liveSearchStatus: asin ? 'validated_keep' : 'search-fallback',
    isLiveEligible: true,
    hasAffiliateUrl: true,

    // Rich display fields
    editorialScore: p.score,
    rating: p.rating,
    reviewCount: p.reviewCount,
    price: p.price,
    priceUpdated: p.price_updated,
    features: p.features,
    pros: p.pros,
    cons: p.cons,
    verdict: p.verdict,
    productImage: p.local_image || p.image,
    breedSizeFit: p.breed_size_fit,
    healthFocus: p.health_focus,
    lifeStage: p.life_stage,
    energyLevelFit: p.energy_level_fit,
  };
}

// ─── batch adapter ────────────────────────────────────────────────────────────

export function adaptProductIndex(
  index: Record<string, ProductIndexEntry>
): RichAmazonProductRecord[] {
  return Object.values(index)
    .filter((p) => p.active !== false)
    .map(adaptProductIndexEntry);
}

// ─── rich scoring ─────────────────────────────────────────────────────────────
// Supplements the base scoreAmazonProduct() with product-index-specific fields.

export function scoreRichProductBonus(
  product: RichAmazonProductRecord,
  context: AmazonPlacementContext
): number {
  let bonus = 0;

  const breedSize = context.breedSize?.toLowerCase();
  const breedCoat = context.breedCoat?.toLowerCase();
  const breedLifeStage = context.breedLifeStage?.toLowerCase();

  if (breedSize && product.breedSizeFit?.some((s) => s.toLowerCase() === breedSize)) bonus += 4;
  if (breedCoat && product.topicTags?.some((t) => t.toLowerCase().includes(breedCoat))) bonus += 2;
  if (breedLifeStage && product.lifeStage?.some((s) => s.toLowerCase() === breedLifeStage)) bonus += 2;

  const contextTags = [
    ...(context.topicTags ?? []),
    context.category ?? '',
    breedSize ?? '',
  ].map((t) => t.toLowerCase());

  for (const focus of product.healthFocus ?? []) {
    if (contextTags.includes(focus.toLowerCase())) bonus += 3;
  }

  // Quality bonus: editorial score (0–10) contributes up to +5
  if (product.editorialScore != null) {
    bonus += product.editorialScore / 2;
  }

  // Search volume tiebreaker (high-volume = more validated interest)
  return bonus;
}
