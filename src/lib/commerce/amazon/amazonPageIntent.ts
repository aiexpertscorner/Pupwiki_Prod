import type { AmazonPlacementContext } from '../../amazon/amazonTypes';

export type AmazonIntent = 'high' | 'medium' | 'low';

const HIGH_INTENT_CLUSTERS = new Set([
  'beds', 'toys', 'grooming', 'travel', 'lifestyle', 'home-cleanup', 'training', 'gear',
]);

const MEDIUM_INTENT_CLUSTERS = new Set([
  'dog-food', 'puppy', 'senior-dogs', 'supplements', 'smart-tech',
]);

const LOW_INTENT_CLUSTERS = new Set([
  'health', 'insurance', 'dog-services', 'senior-dogs',
]);

const HIGH_SENSITIVITY_TAGS = new Set([
  'medical-warning', 'vet-critical', 'emergency-vet', 'diagnosis', 'treatment',
]);

export type AmazonIntentContext = Pick<
  AmazonPlacementContext,
  'pageType' | 'category' | 'topicTags'
> & {
  cluster?: string;
  claimSensitivity?: string;
};

export function getAmazonPageIntent(context: AmazonIntentContext): AmazonIntent {
  const cluster = String(context.cluster || context.category || '').toLowerCase().replace(/\s+/g, '-');
  const tags = (context.topicTags || []).map((t) => String(t).toLowerCase());

  if (tags.some((t) => HIGH_SENSITIVITY_TAGS.has(t))) return 'low';
  if (context.claimSensitivity === 'high') return 'low';

  if (LOW_INTENT_CLUSTERS.has(cluster)) return 'low';

  if (context.pageType === 'breed') {
    if (HIGH_INTENT_CLUSTERS.has(cluster)) return 'high';
    return 'medium';
  }

  if (HIGH_INTENT_CLUSTERS.has(cluster)) return 'high';
  if (MEDIUM_INTENT_CLUSTERS.has(cluster)) return 'medium';

  if (context.pageType === 'category') return 'medium';
  if (context.pageType === 'guide') return 'medium';

  return 'low';
}

export function isCommerceAllowed(context: AmazonIntentContext): boolean {
  const tags = (context.topicTags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => HIGH_SENSITIVITY_TAGS.has(t))) return false;

  const cluster = String(context.cluster || context.category || '').toLowerCase();
  if (cluster === 'insurance' || cluster === 'dog-services') return false;

  return true;
}
