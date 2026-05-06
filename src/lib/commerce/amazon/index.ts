export { getAmazonPageIntent, isCommerceAllowed } from './amazonPageIntent';
export type { AmazonIntent, AmazonIntentContext } from './amazonPageIntent';

export {
  buildClusterQuery,
  buildTagsQuery,
  toAmazonSearchUrl,
  getBestClusterSearchUrl,
} from './amazonSearchQueryBuilder';
export type { ClusterQueryResult } from './amazonSearchQueryBuilder';

export { resolveAmazonCTA, resolveAmazonCTAs } from './amazonGeneratedLinks';
export type { AmazonCTA, AmazonCTAContext } from './amazonGeneratedLinks';
