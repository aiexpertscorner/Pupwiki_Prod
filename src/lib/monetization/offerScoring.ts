import type { NormalizedAwinOffer } from './getBestOffers';

export type OfferContext = {
  pageType: string;
  placement: string;
  topicTags?: string[];
  currentDate?: Date;
};

const normalize = (s: string) => s.toLowerCase().trim().replace(/[-_\s]+/g, '-');

function topicOverlap(offerTags: string[], ctxTags: string[]): number {
  if (ctxTags.length === 0) return 10; // no filter = neutral score
  const offerSet = new Set(offerTags.map(normalize));
  let score = 0;
  for (const t of ctxTags) {
    if (offerSet.has(normalize(t))) score += 3;
  }
  return Math.min(score, 30);
}

function freshnessBonus(offer: NormalizedAwinOffer): number {
  const days = offer.daysUntilEnd;
  if (days === null || days === undefined) return 0;
  if (days < 0) return -20; // expired bonus (shouldn't reach here)
  if (days <= 3) return 10;
  if (days <= 7) return 8;
  if (days <= 14) return 5;
  return 0;
}

/**
 * scoreOfferForContext — returns a composite ranking score for sorting.
 * Higher = better match.
 */
export function scoreOfferForContext(offer: NormalizedAwinOffer, ctx: OfferContext): number {
  let score = offer.qualityScore * 0.3;
  score += topicOverlap(offer.topicTags, ctx.topicTags ?? []) * (25 / 30);
  score += (offer.priority ?? 50) * 0.15;
  score += (offer.type === 'voucher' && offer.voucher?.code ? 10 : 0);
  score += offer.freshnessScore * 0.10;
  score += freshnessBonus(offer);

  if (!offer.joined) score -= 20;
  if (!offer.hasTrackingUrl) score -= 5;

  return score;
}
