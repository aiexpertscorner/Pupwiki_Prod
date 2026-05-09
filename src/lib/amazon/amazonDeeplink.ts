import { getContentCluster } from '../content/contentClusterConfig';
import { AMAZON_ASSOCIATE_TAG, normalizeAmazonTag } from './amazonConfig';
import type { AmazonPlacementContext, AmazonProductRecord } from './amazonTypes';

export interface AmazonSearchRecord extends AmazonProductRecord {
  source: 'amazon-search-template';
  amazonSearchQuery: string;
}

export function buildAmazonSearchUrl(query: string, tag = AMAZON_ASSOCIATE_TAG) {
  const params = new URLSearchParams({
    k: query,
    tag,
  });
  return `https://www.amazon.com/s?${params.toString()}`;
}

export function buildAmazonProductLink(product: AmazonProductRecord, tag = AMAZON_ASSOCIATE_TAG): string {
  if (product.asin?.trim()) {
    return `https://www.amazon.com/dp/${product.asin.trim()}?tag=${tag}`;
  }
  if (product.amazonSearchQuery?.trim()) {
    return buildAmazonSearchUrl(product.amazonSearchQuery.trim(), tag);
  }
  return product.amazonAffiliateUrl || buildAmazonSearchUrl('dog supplies essentials', tag);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function contextClusterSlugs(context: AmazonPlacementContext = {}) {
  return unique([
    normalizeAmazonTag(context.category),
    ...(context.topicTags || []).map(normalizeAmazonTag),
    normalizeAmazonTag(context.breedLifeStage),
  ]).filter((slug) => getContentCluster(slug));
}

function inferSearches(context: AmazonPlacementContext = {}) {
  const clusters = contextClusterSlugs(context)
    .map((slug) => getContentCluster(slug))
    .filter(Boolean) as NonNullable<ReturnType<typeof getContentCluster>>[];

  const searches = clusters.flatMap((cluster) => cluster.amazonSearches.map((search) => ({ cluster, search })));

  if (searches.length) return searches;

  const category = normalizeAmazonTag(context.category);
  if (category) {
    return [{
      cluster: null,
      search: {
        id: `${category}-general`,
        query: category.replace(/-/g, ' '),
        label: category.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        intent: 'medium' as const,
        tags: [category],
      },
    }];
  }

  return [{
    cluster: null,
    search: {
      id: 'dog-supplies-general',
      query: 'dog supplies essentials',
      label: 'Dog supply essentials',
      intent: 'low' as const,
      tags: ['dog-supplies'],
    },
  }];
}

function intentScore(intent?: string) {
  if (intent === 'high') return 90;
  if (intent === 'medium') return 70;
  if (intent === 'low') return 45;
  return 55;
}

export function getAmazonFallbackSearchProducts(context: AmazonPlacementContext = {}): AmazonSearchRecord[] {
  const limit = Math.max(1, context.limit ?? 3);
  const pageSlug = context.pageSlug || '';
  const searches = inferSearches(context);

  return searches.slice(0, limit).map(({ cluster, search }, index) => {
    const query = search.query;
    const topicTags = unique([
      ...(cluster?.amazonTopicTags || []),
      ...(search.tags || []),
      ...(context.topicTags || []),
      context.breedSize || '',
      context.breedEnergy || '',
      context.breedCoat || '',
      context.breedLifeStage || '',
    ]).map(String);

    return {
      id: `amazon-search-${cluster?.slug || normalizeAmazonTag(context.category) || 'general'}-${search.id}`,
      enabled: true,
      source: 'amazon-search-template',
      name: search.label,
      brand: 'Amazon.com search',
      categoryGroup: cluster?.slug || normalizeAmazonTag(context.category) || 'dog-supplies',
      categoryLabel: cluster?.shortTitle || search.label,
      amazonSearchQuery: query,
      amazonAffiliateUrl: buildAmazonSearchUrl(query),
      recommendedPlacement: `Search Amazon.com for ${search.label.toLowerCase()} matched to this PupWiki guide.`,
      topicTags,
      targetPageSlugs: pageSlug ? [pageSlug] : [],
      complianceRisk: cluster?.claimSensitivity === 'high' ? 'medium' : 'low',
      priorityScore: intentScore(search.intent) - index,
      salesIntent: search.intent || 'medium',
      liveSearchStatus: 'generated-search-template',
      isLiveEligible: true,
    } as AmazonSearchRecord;
  });
}

export function mergeAmazonProductsWithFallbacks(
  matched: AmazonProductRecord[],
  context: AmazonPlacementContext = {}
) {
  const limit = Math.max(1, context.limit ?? 3);
  if (matched.length >= limit) return matched.slice(0, limit);
  const fallback = getAmazonFallbackSearchProducts({ ...context, limit: limit - matched.length });
  const seen = new Set(matched.map((product) => product.id));
  return [...matched, ...fallback.filter((product) => !seen.has(product.id))].slice(0, limit);
}
