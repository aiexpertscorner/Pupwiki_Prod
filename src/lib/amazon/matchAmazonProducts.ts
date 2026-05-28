import {
  getAmazonCategoryTags,
  normalizeAmazonPath,
  normalizeAmazonTag,
} from './amazonConfig';
import { mergeAmazonProductsWithFallbacks } from './amazonDeeplink';
import type { AmazonPlacementContext, AmazonProductRecord } from './amazonTypes';

function safeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeList(values?: string[]) {
  return (values ?? []).map(normalizeAmazonTag).filter(Boolean);
}

function hasValidAmazonLink(product: AmazonProductRecord) {
  if (product.asin?.trim()) return true;
  if (product.amazonSearchQuery?.trim()) return true;
  const url = product.amazonAffiliateUrl || '';
  return /^https?:\/\//i.test(url) && (url.includes('amzn.to') || url.includes('amazon.'));
}

function targetMatchesPage(target: string, pageSlug: string) {
  const normalizedTarget = normalizeAmazonPath(target);
  const normalizedPage = normalizeAmazonPath(pageSlug);

  if (!normalizedTarget || !normalizedPage) return false;
  if (normalizedTarget === normalizedPage) return true;
  if (normalizedTarget.includes('[breed]') && normalizedPage.startsWith('/breeds/')) return true;
  if (!normalizedTarget.includes('[') && normalizedPage.startsWith(`${normalizedTarget}/`)) return true;

  return false;
}

function isAllowedByCompliance(product: AmazonProductRecord, context: AmazonPlacementContext) {
  const risk = normalizeAmazonTag(product.complianceRisk || 'unknown');

  if (risk === 'high') return Boolean(context.allowHighRisk);
  if (risk === 'medium') return Boolean(context.allowMediumRisk || context.allowHighRisk);

  return true;
}

function salesIntentScore(value?: string) {
  const intent = normalizeAmazonTag(value);
  if (intent === 'high') return 9;
  if (intent === 'medium') return 5;
  if (intent === 'low') return 1;
  return 0;
}

export function scoreAmazonProduct(product: AmazonProductRecord, context: AmazonPlacementContext = {}) {
  let score = 0;

  const productTags = normalizeList(product.topicTags);
  const contextTags = getAmazonCategoryTags(context.category, [
    ...(context.topicTags ?? []),
    context.breedSize ?? '',
    context.breedEnergy ?? '',
    context.breedCoat ?? '',
    context.breedLifeStage ?? '',
  ]);

  const productBlob = normalizeAmazonTag([
    product.name,
    product.brand,
    product.categoryGroup,
    product.categoryLabel,
    product.recommendedPlacement,
    product.amazonSearchQuery,
  ].filter(Boolean).join(' '));

  for (const tag of contextTags) {
    if (productTags.includes(tag)) score += 10;
    if (productBlob.includes(tag)) score += 2;
  }

  const pageSlug = context.pageSlug || '';
  const targetSlugs = product.targetPageSlugs ?? [];
  if (pageSlug && targetSlugs.some((target) => targetMatchesPage(target, pageSlug))) score += 18;

  const pageType = normalizeAmazonTag(context.pageType);
  if (pageType === 'category' && targetSlugs.some((target) => target.startsWith('/categories/'))) score += 5;
  if (pageType === 'breed' && targetSlugs.some((target) => target.includes('/breeds/[breed]'))) score += 7;
  if (pageType === 'guide' && targetSlugs.some((target) => target.startsWith('/guides/'))) score += 6;

  score += safeNumber(product.priorityScore, 0) / 10;
  score += salesIntentScore(product.salesIntent);

  if (normalizeAmazonTag(product.liveSearchStatus).includes('validated')) score += 4;
  if (product.isLiveEligible) score += 3;

  if (
    normalizeAmazonTag(product.categoryGroup) === 'health-adjacent' &&
    !contextTags.some((tag) => ['health', 'wellness', 'supplements', 'joint', 'dental', 'pill', 'calming'].includes(tag))
  ) {
    score -= 6;
  }

  return score;
}

export function matchValidatedAmazonProducts(products: AmazonProductRecord[], context: AmazonPlacementContext = {}) {
  const excluded = new Set(context.excludeProductIds ?? []);
  const limit = Math.max(1, context.limit ?? 3);

  return products
    .filter((product) => product.enabled)
    .filter((product) => !excluded.has(product.id))
    .filter(hasValidAmazonLink)
    .filter((product) => isAllowedByCompliance(product, context))
    .map((product) => ({ product, score: scoreAmazonProduct(product, context) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function matchAmazonProducts(products: AmazonProductRecord[], context: AmazonPlacementContext = {}) {
  const validated = matchValidatedAmazonProducts(products, context);
  return mergeAmazonProductsWithFallbacks(validated, context);
}

export function matchTopAmazonProduct(products: AmazonProductRecord[], context: AmazonPlacementContext = {}) {
  return matchAmazonProducts(products, { ...context, limit: 1 })[0] ?? null;
}

export function getEnabledAmazonProductCount(products: AmazonProductRecord[]) {
  return products.filter((product) => product.enabled && hasValidAmazonLink(product)).length;
}

export type { AmazonPlacementContext } from './amazonTypes';
