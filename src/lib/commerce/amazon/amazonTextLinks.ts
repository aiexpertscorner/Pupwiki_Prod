import { buildAmazonSearchUrl } from '../../amazon/amazonDeeplink';
import { AMAZON_ASSOCIATE_TAG } from '../../amazon/amazonConfig';
import { buildClusterQuery, buildTagsQuery } from './amazonSearchQueryBuilder';
import type { AmazonSearchTemplate } from '../../content/contentClusterConfig';

export interface AmazonTextLink {
  id: string;
  label: string;
  query: string;
  href: string;
  intent: 'high' | 'medium' | 'low';
  rel: 'nofollow sponsored';
  source: 'cluster-search' | 'tag-fallback';
}

interface ResolveContext {
  cluster?: { slug: string; amazonSearches?: AmazonSearchTemplate[] };
  topicTags?: string[];
  intent?: 'high' | 'medium' | 'low';
  maxLinks?: number;
}

const SAFE_LABEL_PREFIXES = [
  'Compare',
  'Browse',
  'Check',
  'Explore',
  'Find',
  'Shop',
];

function safeLabel(raw: string, index: number): string {
  const prefix = SAFE_LABEL_PREFIXES[index % SAFE_LABEL_PREFIXES.length];
  const cleaned = raw
    .replace(/\b(best deal|on sale|discount|save|cheapest|lowest price|best price)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${prefix} ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)} on Amazon`;
}

export function resolveAmazonTextLinks(context: ResolveContext): AmazonTextLink[] {
  const { cluster, topicTags = [], intent = 'medium', maxLinks = 1 } = context;

  if (intent === 'low' || maxLinks <= 0) return [];

  const links: AmazonTextLink[] = [];

  // 1. Try cluster amazonSearches first (highest quality, most specific)
  if (cluster?.slug && cluster.amazonSearches?.length) {
    const sorted = [...cluster.amazonSearches].sort((a, b) => {
      const score = (i?: string) => i === 'high' ? 3 : i === 'medium' ? 2 : 1;
      return score(b.intent) - score(a.intent);
    });

    for (const search of sorted.slice(0, maxLinks)) {
      if (links.length >= maxLinks) break;
      const href = buildAmazonSearchUrl(search.query, AMAZON_ASSOCIATE_TAG);
      links.push({
        id: `cluster-${cluster.slug}-${search.id}`,
        label: safeLabel(search.label, links.length),
        query: search.query,
        href,
        intent: (search.intent as 'high' | 'medium' | 'low') ?? 'medium',
        rel: 'nofollow sponsored',
        source: 'cluster-search',
      });
    }
  }

  // 2. Fall back to cluster slug query if cluster has no amazonSearches
  if (links.length < maxLinks && cluster?.slug) {
    const result = buildClusterQuery(cluster.slug);
    if (result) {
      const href = buildAmazonSearchUrl(result.query, AMAZON_ASSOCIATE_TAG);
      links.push({
        id: `cluster-slug-${cluster.slug}`,
        label: safeLabel(result.label, links.length),
        query: result.query,
        href,
        intent: result.intent,
        rel: 'nofollow sponsored',
        source: 'cluster-search',
      });
    }
  }

  // 3. Fall back to topic tags
  if (links.length < maxLinks && topicTags.length > 0) {
    const result = buildTagsQuery(topicTags);
    const href = buildAmazonSearchUrl(result.query, AMAZON_ASSOCIATE_TAG);
    links.push({
      id: `tags-${topicTags.slice(0, 2).join('-')}`,
      label: safeLabel(result.label, links.length),
      query: result.query,
      href,
      intent: result.intent,
      rel: 'nofollow sponsored',
      source: 'tag-fallback',
    });
  }

  return links.slice(0, maxLinks);
}
