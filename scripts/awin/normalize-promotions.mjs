/**
 * normalize-promotions.mjs
 * Maps raw AWIN promotion API rows to PupWiki's NormalizedAwinOffer schema.
 */

const normalize = (s) => (s ?? '').toLowerCase().trim().replace(/[-_\s]+/g, '-');

function stripHtml(str) {
  return (str ?? '').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return isFinite(ms) ? Math.ceil(ms / 86400000) : null;
}

// Infer topic tags from advertiser name + offer title/description
const TAG_KEYWORDS = {
  food: ['food', 'meal', 'diet', 'nutrition', 'kibble', 'raw', 'fresh', 'broth', 'hydrat'],
  treats: ['treat', 'chew', 'snack', 'jerky', 'biscuit'],
  supplements: ['supplement', 'vitamin', 'joint', 'probiotic', 'omega', 'hip'],
  grooming: ['groom', 'shampoo', 'brush', 'coat', 'shed', 'bath', 'nail'],
  training: ['train', 'behav', 'obedien', 'recall', 'bark', 'leash', 'collar', 'harness'],
  toys: ['toy', 'play', 'enrichment', 'chew'],
  travel: ['travel', 'carrier', 'crate', 'car seat', 'seat belt'],
  insurance: ['insur', 'coverage', 'vet', 'health plan', 'protect'],
  photography: ['photo', 'portrait', 'canvas', 'print', 'custom'],
  apparel: ['apparel', 'shirt', 'hoodie', 'clothing', 'merch', 'cap', 'hat'],
  puppy: ['puppy', 'puppie', 'young dog', 'new dog'],
  senior: ['senior', 'older dog', 'aging', 'geriatric'],
};

function inferTopicTags(text, programTags = []) {
  const lower = text.toLowerCase();
  const tags = new Set(programTags.map(normalize));

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) tags.add(tag);
  }

  return [...tags];
}

// Map topic tags to suitable page types and placement positions
function inferPageTypes(topicTags) {
  const types = new Set(['category', 'breed']);

  if (topicTags.some((t) => ['food', 'treats', 'supplements', 'grooming'].includes(t))) {
    types.add('guide');
    types.add('home');
  }
  if (topicTags.some((t) => ['photography', 'apparel'].includes(t))) {
    types.add('brand');
  }
  if (topicTags.includes('insurance')) {
    types.add('guide');
  }

  return [...types];
}

function inferPlacements(topicTags, pageTypes) {
  const placements = new Set();

  if (pageTypes.includes('home')) placements.add('home-deal-strip');
  if (pageTypes.includes('category')) {
    placements.add('category-after-intro');
    placements.add('category-mid-content');
  }
  if (pageTypes.includes('guide')) {
    placements.add('guide-after-intro');
    placements.add('guide-mid-content');
    placements.add('guide-bottom');
  }
  if (pageTypes.includes('breed')) {
    placements.add('breed-before-faq');
    placements.add('breed-bottom');
  }
  if (pageTypes.includes('brand')) {
    placements.add('brand-hero');
    placements.add('brand-offer-grid');
  }

  return [...placements];
}

/**
 * normalizePromotion(raw, joinedAdvertiserIds, programMap)
 * @param {object} raw — raw API row
 * @param {Set<string>} joinedAdvertiserIds
 * @param {Map<string, object>} programMap — advertiserId → program
 * @returns {NormalizedAwinOffer}
 */
export function normalizePromotion(raw, joinedAdvertiserIds, programMap) {
  const advertiserId = String(
    raw.advertiser?.id ?? raw.advertiserId ?? raw.advertiser_id ?? ''
  );
  const advertiserName = String(
    raw.advertiser?.name ?? raw.advertiserName ?? raw.advertiser_name ?? 'Unknown'
  );

  if (!advertiserId) return null;

  const joined = joinedAdvertiserIds.has(advertiserId);
  const program = programMap.get(advertiserId);

  const title = stripHtml(raw.title ?? raw.name ?? '');
  const description = stripHtml(raw.description ?? '');
  const terms = stripHtml(raw.terms ?? raw.termsAndConditions ?? '');

  const shortTitle = title.length > 60 ? title.slice(0, 57) + '…' : title;

  const urlTracking = raw.urlTracking ?? raw.url_tracking ?? raw.trackingUrl ?? '';
  const urlFallback = raw.url ?? raw.clickUrl ?? '';
  const bestUrl = urlTracking || urlFallback || null;

  const voucher = raw.voucher ?? null;
  const voucherCode = voucher?.code ?? null;
  const hasCode = Boolean(voucherCode && voucherCode.trim().length > 0);

  const rawType = (raw.type ?? '').toLowerCase();
  const type = rawType === 'voucher' || hasCode ? 'voucher' : 'promotion';

  const rawStatus = (raw._fetchedStatus ?? raw.status ?? '').toLowerCase();
  const status =
    rawStatus === 'expiringsoon' ? 'expiringSoon'
    : rawStatus === 'upcoming' ? 'upcoming'
    : rawStatus === 'expired' ? 'expired'
    : 'active';

  const endDate = raw.endDate ?? raw.end_date ?? null;
  const startDate = raw.startDate ?? raw.start_date ?? null;
  const dateAdded = raw.dateAdded ?? raw.date_added ?? raw.createdAt ?? null;

  const now = Date.now();
  const endMs = endDate ? new Date(endDate).getTime() : null;
  const isExpired = endMs !== null && endMs < now;
  const daysLeft = daysUntil(endDate);
  const isExpiringSoon = !isExpired && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isUpcoming = status === 'upcoming';

  const regions = {
    all: Boolean(raw.regions?.all ?? raw.worldwide),
    countryCodes: Array.isArray(raw.regions?.regionCodes)
      ? raw.regions.regionCodes
      : Array.isArray(raw.regionCodes) ? raw.regionCodes : [],
    names: Array.isArray(raw.regions?.names) ? raw.regions.names : [],
  };

  const programTags = program?.topicTags ?? [];
  const inferText = `${advertiserName} ${title} ${description}`;
  const topicTags = inferTopicTags(inferText, programTags);
  const pageTypes = inferPageTypes(topicTags);
  const placements = inferPlacements(topicTags, pageTypes);

  const id = `awin-offer-${advertiserId}-${raw.promotionId ?? raw.id ?? Date.now()}`;

  return {
    id,
    source: 'awin-offers-api',
    rawPromotionId: String(raw.promotionId ?? raw.id ?? ''),
    type,
    status,
    advertiserId,
    advertiserName,
    advertiserSlug: slugify(advertiserName),
    joined,
    title,
    shortTitle,
    description: description || undefined,
    cleanDescription: description ? description.slice(0, 200) : undefined,
    terms: terms || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    dateAdded: dateAdded || undefined,
    daysUntilEnd: daysLeft,
    isExpired,
    isExpiringSoon,
    isUpcoming,
    url: urlFallback || undefined,
    urlTracking: urlTracking || undefined,
    bestUrl,
    hasTrackingUrl: Boolean(urlTracking),
    regions,
    voucher: hasCode
      ? { code: voucherCode, exclusive: voucher?.exclusive ?? false, attributable: voucher?.attributable ?? false }
      : undefined,
    topicTags,
    pageTypes,
    placements,
    excludeTags: [],
    priority: program?.priority ?? 50,
    qualityScore: 0, // filled by scorer
    commercialScore: 0,
    safetyScore: 0,
    freshnessScore: 0,
    relevanceHints: [],
    enabled: false, // set by scorer
    warnings: [],
  };
}

/**
 * normalizeAll(rows, joinedAdvertiserIds, programMap)
 * Maps + deduplicates all raw rows.
 */
export function normalizeAll(rows, joinedAdvertiserIds, programMap) {
  const normalized = [];
  const seenByPromoId = new Map();
  const seenByTitleKey = new Map();
  const seenByVoucherKey = new Map();

  for (const raw of rows) {
    const offer = normalizePromotion(raw, joinedAdvertiserIds, programMap);
    if (!offer) continue;

    // Dedup by promotionId
    if (seenByPromoId.has(offer.rawPromotionId)) {
      const existing = seenByPromoId.get(offer.rawPromotionId);
      // Keep active over expiring/upcoming
      if (offer.status === 'active' && existing.status !== 'active') {
        seenByPromoId.set(offer.rawPromotionId, offer);
      }
      continue;
    }
    seenByPromoId.set(offer.rawPromotionId, offer);

    // Dedup by advertiser + normalized title + endDate
    const titleKey = `${offer.advertiserId}::${normalize(offer.title)}::${offer.endDate ?? ''}`;
    if (seenByTitleKey.has(titleKey)) continue;
    seenByTitleKey.set(titleKey, true);

    // Dedup by voucher code + advertiser
    if (offer.voucher?.code) {
      const vKey = `${offer.advertiserId}::${offer.voucher.code}`;
      if (seenByVoucherKey.has(vKey)) continue;
      seenByVoucherKey.set(vKey, true);
    }

    normalized.push(offer);
  }

  return normalized;
}
