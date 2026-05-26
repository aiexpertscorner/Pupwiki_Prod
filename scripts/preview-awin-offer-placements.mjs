#!/usr/bin/env node
/**
 * preview-awin-offer-placements.mjs
 * Generates awin-offer-placement-preview.json for diagnostic purposes.
 * Shows which offers would be selected for representative page contexts.
 * NOT consumed by the production build.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return null; }
}

const normalized = readJson(join(DATA, 'awin-offers.normalized.json')) ?? [];

const CONTEXTS = [
  { name: 'Home deal strip',       pageType: 'home',     placement: 'home-deal-strip',        topicTags: ['food', 'training', 'grooming', 'dog-care'], maxItems: 2 },
  { name: 'Category — food',       pageType: 'category', placement: 'category-after-intro',   topicTags: ['food', 'nutrition', 'treats'],             maxItems: 2 },
  { name: 'Category — training',   pageType: 'category', placement: 'category-after-intro',   topicTags: ['training', 'behavior', 'collar'],          maxItems: 2 },
  { name: 'Guide — nutrition',     pageType: 'guide',    placement: 'guide-mid-content',      topicTags: ['food', 'nutrition', 'supplements'],        maxItems: 1 },
  { name: 'Guide — grooming',      pageType: 'guide',    placement: 'guide-mid-content',      topicTags: ['grooming', 'shampoo', 'brush'],            maxItems: 1 },
  { name: 'Breed — general',       pageType: 'breed',    placement: 'breed-bottom',           topicTags: ['food', 'grooming', 'training'],            maxItems: 1 },
  { name: 'Brand hero',            pageType: 'brand',    placement: 'brand-hero',             topicTags: ['food', 'nutrition'],                       maxItems: 1 },
  { name: 'Brand offer grid',      pageType: 'brand',    placement: 'brand-offer-grid',       topicTags: ['food', 'nutrition', 'treats'],             maxItems: 6 },
];

const enabled = normalized.filter((o) => o.enabled && !o.isExpired && o.bestUrl);

function selectForContext(ctx) {
  let candidates = enabled.filter((o) =>
    o.pageTypes.includes(ctx.pageType) &&
    o.placements.includes(ctx.placement)
  );

  if (ctx.topicTags?.length > 0) {
    const tagSet = new Set(ctx.topicTags.map((t) => t.toLowerCase()));
    candidates = candidates.filter((o) =>
      o.topicTags.some((t) => tagSet.has(t.toLowerCase()))
    );
  }

  // Simple sort: vouchers first, then by quality
  candidates.sort((a, b) => {
    if (a.type === 'voucher' && b.type !== 'voucher') return -1;
    if (b.type === 'voucher' && a.type !== 'voucher') return 1;
    return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
  });

  // Max 2 per advertiser
  const seen = new Map();
  const results = [];
  for (const o of candidates) {
    const count = seen.get(o.advertiserId) ?? 0;
    if (count < 2) { results.push(o); seen.set(o.advertiserId, count + 1); }
    if (results.length >= ctx.maxItems) break;
  }
  return results;
}

const contexts = CONTEXTS.map((ctx) => ({
  context: ctx,
  matched: selectForContext(ctx).map((o) => ({
    id: o.id,
    type: o.type,
    status: o.status,
    title: o.shortTitle,
    advertiser: o.advertiserName,
    qualityScore: o.qualityScore,
    hasVoucherCode: Boolean(o.voucher?.code),
    daysUntilEnd: o.daysUntilEnd,
    bestUrl: o.bestUrl,
  })),
}));

const preview = { generatedAt: new Date().toISOString(), totalEnabled: enabled.length, contexts };

writeFileSync(join(DATA, 'awin-offer-placement-preview.json'), JSON.stringify(preview, null, 2) + '\n');

console.log(`\nAWIN Offer Placement Preview`);
console.log('─'.repeat(50));
console.log(`Total enabled offers: ${enabled.length}`);
for (const { context, matched } of contexts) {
  console.log(`\n  ${context.name} [${context.pageType}/${context.placement}]`);
  if (matched.length === 0) {
    console.log('    (no matches)');
  } else {
    matched.forEach((m) => console.log(`    ✓ [${m.type}] ${m.title} — ${m.advertiser} (q=${m.qualityScore})`));
  }
}
console.log(`\nWrote awin-offer-placement-preview.json\n`);
