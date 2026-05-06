import { getContentCluster } from '../../content/contentClusterConfig';
import { buildAmazonSearchUrl } from '../../amazon/amazonDeeplink';
import { AMAZON_ASSOCIATE_TAG } from '../../amazon/amazonConfig';

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

function titleCase(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface ClusterQueryResult {
  query: string;
  label: string;
  intent: 'high' | 'medium' | 'low';
  tags: string[];
}

export function buildClusterQuery(cluster: string, breedName?: string): ClusterQueryResult | null {
  const clusterData = getContentCluster(normalize(cluster));
  if (!clusterData) return null;

  const searches = clusterData.amazonSearches;
  if (!searches || searches.length === 0) return null;

  const best = searches.reduce((top, s) => {
    const score = s.intent === 'high' ? 3 : s.intent === 'medium' ? 2 : 1;
    const topScore = top.intent === 'high' ? 3 : top.intent === 'medium' ? 2 : 1;
    return score > topScore ? s : top;
  }, searches[0]);

  const query = breedName
    ? `${breedName} ${best.query}`
    : best.query;

  return {
    query,
    label: breedName
      ? `${breedName} ${best.label.toLowerCase()}`
      : best.label,
    intent: (best.intent as 'high' | 'medium' | 'low') ?? 'medium',
    tags: best.tags ?? [],
  };
}

export function buildTagsQuery(topicTags: string[], breedName?: string): ClusterQueryResult {
  const cleaned = topicTags
    .filter(Boolean)
    .map((t) => String(t).replace(/[-_]+/g, ' ').toLowerCase())
    .filter((t) => !['dog', 'dog-owner', 'dog-parent', 'general'].includes(t.replace(/\s/g, '-')));

  const baseTerms = cleaned.slice(0, 3).join(' ');
  const query = breedName
    ? `${breedName} ${baseTerms || 'dog supplies'}`
    : (baseTerms ? `dog ${baseTerms}` : 'dog supplies essentials');

  const label = breedName
    ? `${breedName} ${titleCase(cleaned[0] || 'dog supplies')}`
    : titleCase(cleaned[0] || 'Dog supplies');

  return { query, label, intent: 'medium', tags: cleaned };
}

export function toAmazonSearchUrl(query: string, tag?: string): string {
  return buildAmazonSearchUrl(query, tag ?? AMAZON_ASSOCIATE_TAG);
}

export function getBestClusterSearchUrl(
  cluster: string,
  breedName?: string,
  tag?: string
): string {
  const result = buildClusterQuery(cluster, breedName);
  if (result) return toAmazonSearchUrl(result.query, tag);
  const fallback = buildTagsQuery([cluster], breedName);
  return toAmazonSearchUrl(fallback.query, tag);
}
