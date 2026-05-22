import type { CommerceContext, NormalizedAwinProduct, ScoredCommerceProduct } from './types';
import { getPlacementRule } from './placementRules';
import { normalizeText } from './productTaxonomy';

function arrayFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  if (typeof value === 'string') return [normalizeText(value)].filter(Boolean);
  return [];
}

function getContextTerms(context: CommerceContext): string[] {
  const terms = [
    context.title,
    context.category,
    context.breedName,
    context.breedSize,
    context.coatType,
    context.groomingNeeds,
    context.energyLevel,
    context.lifeStage,
    ...arrayFromUnknown(context.tags),
  ];
  return [...new Set(terms.map((term) => normalizeText(term)).filter(Boolean))];
}

function scoreRelevance(product: NormalizedAwinProduct, context: CommerceContext): number {
  const terms = getContextTerms(context);

  if (context.pageType === 'brand') {
    const merchantMatch =
      context.merchant && normalizeText(product.merchant) === normalizeText(context.merchant);
    const programMatch =
      context.programId && normalizeText(product.programId) === normalizeText(context.programId);
    if (merchantMatch || programMatch) return 100;
    return 0;
  }

  if (!terms.length) {
    return product.commercialIntent === 'high' ? 55 : 35;
  }

  const productText = normalizeText(
    [
      product.name,
      product.description,
      product.category,
      product.normalizedType,
      product.topicTags.join(' '),
      product.contentFit.join(' '),
    ].join(' '),
  );

  let score = 0;
  for (const term of terms) {
    if (product.contentFit.map(normalizeText).includes(term)) score += 18;
    else if (product.topicTags.map(normalizeText).includes(term)) score += 12;
    else if (productText.includes(term)) score += 8;
  }

  const category = normalizeText(context.category || context.title || '');
  if (category.includes('nutrition') || category.includes('food')) {
    if (['food', 'treats'].includes(product.normalizedType)) score += 25;
    if (product.normalizedType === 'brand-merch') score -= 80;
  }
  if (category.includes('training') || category.includes('behavior')) {
    if (['training', 'treats', 'toy', 'walking'].includes(product.normalizedType)) score += 25;
    if (product.normalizedType === 'brand-merch') score -= 80;
  }
  if (category.includes('grooming') || category.includes('coat')) {
    if (product.normalizedType === 'grooming') score += 30;
  }
  if (context.pageType === 'breed') {
    if (
      ['grooming', 'bed', 'walking', 'toy', 'crate', 'cleaning', 'food', 'treats'].includes(product.normalizedType)
    ) {
      score += 15;
    }
    if (product.normalizedType === 'brand-merch') score -= 100;
  }

  return Math.max(0, Math.min(score, 100));
}

function scoreConversionIntent(product: NormalizedAwinProduct): number {
  if (product.commercialIntent === 'high') return 100;
  if (product.commercialIntent === 'medium') return 65;
  return 25;
}

function scoreDiversity(
  product: NormalizedAwinProduct,
  merchantCounts: Map<string, number>,
): number {
  const count = merchantCounts.get(normalizeText(product.merchant)) || 0;
  if (count === 0) return 100;
  if (count === 1) return 60;
  return 20;
}

function mismatchPenalty(
  product: NormalizedAwinProduct,
  context: CommerceContext,
): number {
  const rule = getPlacementRule(context.placement);
  let penalty = 0;

  if (!product.url) penalty += 1000;
  if (rule?.requireImage && !product.image) penalty += 1000;
  if (!rule?.allowMerch && product.normalizedType === 'brand-merch') penalty += 1000;
  if (rule?.excludedTypes?.includes(product.normalizedType)) penalty += 1000;
  if (product.excludedPlacements.includes(context.placement as any)) penalty += 1000;

  const text = normalizeText(
    `${context.title || ''} ${context.category || ''} ${arrayFromUnknown(context.tags).join(' ')}`,
  );
  if (
    (text.includes('health') || text.includes('symptom') || text.includes('pain')) &&
    product.normalizedType === 'supplement'
  ) {
    penalty += 35;
  }

  return penalty;
}

export function scoreProduct(
  product: NormalizedAwinProduct,
  context: CommerceContext,
  merchantCounts = new Map<string, number>(),
): ScoredCommerceProduct {
  const relevance = scoreRelevance(product, context);
  const quality = product.qualityScore;
  const merchantPriorityScore = product.merchantPriority;
  const conversionIntent = scoreConversionIntent(product);
  const diversity = scoreDiversity(product, merchantCounts);
  const penalty = mismatchPenalty(product, context);

  const score =
    relevance * 0.45 +
    quality * 0.25 +
    merchantPriorityScore * 0.15 +
    conversionIntent * 0.1 +
    diversity * 0.05 -
    penalty;

  return {
    ...product,
    score,
    scoreBreakdown: {
      relevance,
      quality,
      merchantPriority: merchantPriorityScore,
      conversionIntent,
      diversity,
      mismatchPenalty: penalty,
    },
  };
}
