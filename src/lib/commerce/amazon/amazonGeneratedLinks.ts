import { matchValidatedAmazonProducts } from '../../amazon/matchAmazonProducts';
import { mergeAmazonProductsWithFallbacks, buildAmazonProductLink } from '../../amazon/amazonDeeplink';
import type { AmazonPlacementContext, AmazonProductRecord } from '../../amazon/amazonTypes';
import { buildClusterQuery, buildTagsQuery, toAmazonSearchUrl } from './amazonSearchQueryBuilder';
import { getAmazonPageIntent, isCommerceAllowed } from './amazonPageIntent';

export interface AmazonCTA {
  type: 'direct' | 'search';
  url: string;
  label: string;
  query?: string;
  productId?: string;
  productName?: string;
}

export type AmazonCTAContext = AmazonPlacementContext & {
  cluster?: string;
  breedName?: string;
  claimSensitivity?: string;
};

function productToCTA(product: AmazonProductRecord): AmazonCTA {
  const isSearch = product.source === 'amazon-search-template';
  return {
    type: isSearch ? 'search' : 'direct',
    url: buildAmazonProductLink(product),
    label: product.name,
    query: isSearch ? product.amazonSearchQuery : undefined,
    productId: isSearch ? undefined : product.id,
    productName: isSearch ? undefined : product.name,
  };
}

export function resolveAmazonCTA(
  products: AmazonProductRecord[],
  context: AmazonCTAContext
): AmazonCTA | null {
  if (!isCommerceAllowed(context)) return null;

  const matched = matchValidatedAmazonProducts(products, { ...context, limit: 1 });
  if (matched.length > 0) return productToCTA(matched[0]);

  const cluster = context.cluster || context.category || '';
  const queryResult = cluster
    ? buildClusterQuery(cluster, context.breedName)
    : buildTagsQuery(context.topicTags || [], context.breedName);

  if (!queryResult) return null;

  const url = toAmazonSearchUrl(queryResult.query);
  return { type: 'search', url, label: queryResult.label, query: queryResult.query };
}

export function resolveAmazonCTAs(
  products: AmazonProductRecord[],
  context: AmazonCTAContext
): AmazonCTA[] {
  if (!isCommerceAllowed(context)) return [];

  const intent = getAmazonPageIntent(context);
  const limit = context.limit ?? (intent === 'high' ? 3 : intent === 'medium' ? 2 : 1);

  const validated = matchValidatedAmazonProducts(products, { ...context, limit });
  const merged = mergeAmazonProductsWithFallbacks(validated, { ...context, limit });

  return merged.slice(0, limit).map(productToCTA);
}
