/**
 * score-promotions.mjs
 * Scores and enables normalized AWIN offers.
 */

const BLOCKED_CLAIM_TERMS = [
  /\bguaranteed\b/i,
  /\bvet[- ]?approved\b/i,
  /\bscientifically proven\b/i,
  /\bcure[sd]?\b/i,
  /\btreats anxiety\b/i,
  /\bstops aggression\b/i,
  /\bmiracle\b/i,
  /\bclinically proven\b/i,
  /\bfda[- ]?approved\b/i,
];

const OFF_TOPIC_SIGNALS = [
  'casino', 'dating', 'loan', 'crypto', 'forex', 'gambling',
  'weight loss', 'diet pill', 'pharmacy', 'drug',
];

function hasSafetyIssue(offer) {
  const text = `${offer.title} ${offer.description ?? ''}`;
  if (BLOCKED_CLAIM_TERMS.some((re) => re.test(text))) return true;
  if (OFF_TOPIC_SIGNALS.some((s) => text.toLowerCase().includes(s))) return true;
  return false;
}

function qualityScore(offer, programMap) {
  let score = 0;

  if (offer.joined) score += 25;
  if (offer.status === 'active') score += 20;
  if (offer.status === 'expiringSoon') score += 10;
  if (offer.hasTrackingUrl) score += 15;
  if (offer.voucher?.code) score += 10;
  if (offer.voucher?.exclusive) score += 5;
  if (offer.voucher?.attributable) score += 3;
  if (offer.title.length > 10) score += 5;
  if (offer.description && offer.description.length > 20) score += 5;
  if (offer.terms) score += 2;

  // Advertiser has products in the feed
  const prog = programMap.get(offer.advertiserId);
  if (prog && (prog.productCount ?? 0) > 0) score += 10;

  return Math.min(score, 100);
}

function freshnessScore(offer) {
  const days = offer.daysUntilEnd;
  if (days === null) return 50;
  if (days < 0) return 0; // expired
  if (days <= 3) return 90; // very urgent
  if (days <= 7) return 80;
  if (days <= 14) return 65;
  if (days <= 30) return 50;
  return 40; // long-lived
}

function topicRelevanceScore(offer) {
  // Base relevance: any pet-relevant tags
  const petTags = ['food', 'treats', 'supplements', 'grooming', 'training', 'toys', 'travel', 'insurance', 'puppy', 'senior'];
  const matchCount = offer.topicTags.filter((t) => petTags.includes(t)).length;
  return Math.min(matchCount * 20, 100);
}

function merchantPriorityScore(offer, programMap) {
  const prog = programMap.get(offer.advertiserId);
  return prog ? Math.min((prog.priority ?? 50), 100) : 50;
}

function voucherBoost(offer) {
  if (!offer.voucher?.code) return 0;
  let boost = 60;
  if (offer.voucher.exclusive) boost += 20;
  if (offer.voucher.attributable) boost += 10;
  return boost;
}

/**
 * scoreOffer(offer, programMap)
 * Mutates offer in place: sets qualityScore, commercialScore, freshnessScore, safetyScore, enabled
 */
export function scoreOffer(offer, programMap) {
  const safe = !hasSafetyIssue(offer);
  offer.safetyScore = safe ? 1 : 0;

  offer.qualityScore = qualityScore(offer, programMap);
  offer.freshnessScore = freshnessScore(offer);
  const topicRel = topicRelevanceScore(offer);
  const merchantPri = merchantPriorityScore(offer, programMap);
  const vBoost = voucherBoost(offer);

  // Weighted composite
  offer.commercialScore = Math.round(
    offer.qualityScore * 0.30
    + topicRel * 0.25
    + merchantPri * 0.15
    + vBoost * 0.10
    + offer.freshnessScore * 0.10
    + (offer.placements.length > 0 ? 10 : 0) * 0.10
  );

  // Warnings
  if (!offer.hasTrackingUrl && offer.bestUrl) offer.warnings.push('no-tracking-url');
  if (!offer.joined) offer.warnings.push('not-joined');
  if (!offer.bestUrl) offer.warnings.push('no-url');
  if (offer.isExpired) offer.warnings.push('expired');
  if (!safe) offer.warnings.push('safety-block');
  if (offer.type === 'voucher' && !offer.voucher?.code) offer.warnings.push('voucher-no-code');

  // Enable if all hard requirements pass
  offer.enabled =
    offer.joined
    && Boolean(offer.bestUrl)
    && !offer.isExpired
    && safe
    && offer.qualityScore >= 40;

  return offer;
}

/**
 * scoreAll(offers, programMap)
 */
export function scoreAll(offers, programMap) {
  return offers.map((o) => scoreOffer(o, programMap));
}
