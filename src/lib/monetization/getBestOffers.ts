import offersData from '../../data/awin-offers.normalized.json';
import { isMedicalContext, isSafeOffer } from './offerSafety';
import { scoreOfferForContext, type OfferContext } from './offerScoring';

export type NormalizedAwinOffer = {
  id: string;
  source: string;
  rawPromotionId: string;
  type: 'promotion' | 'voucher';
  status: 'active' | 'expiringSoon' | 'upcoming' | 'expired' | 'unknown';
  advertiserId: string;
  advertiserName: string;
  advertiserSlug: string;
  joined: boolean;
  title: string;
  shortTitle: string;
  description?: string;
  cleanDescription?: string;
  terms?: string;
  startDate?: string;
  endDate?: string;
  dateAdded?: string;
  daysUntilEnd?: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isUpcoming: boolean;
  url?: string;
  urlTracking?: string;
  bestUrl: string | null;
  hasTrackingUrl: boolean;
  regions: { all: boolean; countryCodes: string[]; names: string[] };
  voucher?: { code: string; exclusive?: boolean; attributable?: boolean };
  topicTags: string[];
  pageTypes: string[];
  placements: string[];
  excludeTags: string[];
  priority: number;
  qualityScore: number;
  commercialScore: number;
  safetyScore: number;
  freshnessScore: number;
  relevanceHints: string[];
  enabled: boolean;
  warnings: string[];
};

export type GetOffersContext = {
  pageType: string;
  placement: string;
  topicTags?: string[];
  merchant?: string;
  maxItems?: number;
  isMedical?: boolean;
  currentDate?: Date;
};

const allOffers = offersData as unknown as NormalizedAwinOffer[];

export function getBestOffers(ctx: GetOffersContext): NormalizedAwinOffer[] {
  const { pageType, placement, topicTags = [], merchant, maxItems = 1, isMedical = false } = ctx;

  // Hard block: medical context
  if (isMedical || isMedicalContext(topicTags)) return [];

  const normalize = (s: string) => s.toLowerCase().trim();
  const tagSet = new Set(topicTags.map(normalize));

  let candidates = allOffers.filter((o) => {
    if (!o.enabled) return false;
    if (o.isExpired) return false;
    if (!o.bestUrl) return false;
    if (!isSafeOffer(o)) return false;
    if (!o.pageTypes.includes(pageType)) return false;
    if (!o.placements.includes(placement)) return false;
    return true;
  });

  // Topic tag filter (if tags provided, at least one must match)
  if (tagSet.size > 0) {
    candidates = candidates.filter((o) =>
      o.topicTags.some((t) => tagSet.has(normalize(t)))
    );
  }

  // Optional merchant filter
  if (merchant) {
    const m = normalize(merchant);
    candidates = candidates.filter((o) =>
      normalize(o.advertiserName).includes(m) || normalize(o.advertiserSlug).includes(m)
    );
  }

  // Score and sort
  const scoringCtx: OfferContext = { pageType, placement, topicTags, currentDate: ctx.currentDate };
  candidates.sort((a, b) => scoreOfferForContext(b, scoringCtx) - scoreOfferForContext(a, scoringCtx));

  // Max 2 per advertiser (unless merchant-specific query)
  const result: NormalizedAwinOffer[] = [];
  const advertiserCount = new Map<string, number>();
  const perAdvertiserMax = merchant ? 999 : 2;

  for (const offer of candidates) {
    const count = advertiserCount.get(offer.advertiserId) ?? 0;
    if (count >= perAdvertiserMax) continue;
    result.push(offer);
    advertiserCount.set(offer.advertiserId, count + 1);
    if (result.length >= maxItems) break;
  }

  return result;
}
