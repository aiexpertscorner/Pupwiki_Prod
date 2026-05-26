/**
 * write-promotions-output.mjs
 * Writes normalized AWIN offer JSON files to src/data/.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '..', 'src', 'data');

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * writePromotionsOutput(raw, normalized, meta)
 * Writes three JSON files and returns the stats object.
 */
export function writePromotionsOutput(raw, normalized, meta) {
  const enabled = normalized.filter((o) => o.enabled);
  const expired = normalized.filter((o) => o.isExpired);
  const expiringSoon = normalized.filter((o) => o.isExpiringSoon && !o.isExpired);
  const upcoming = normalized.filter((o) => o.isUpcoming);
  const active = normalized.filter((o) => o.status === 'active' && !o.isExpired);
  const vouchers = normalized.filter((o) => o.type === 'voucher');
  const withCode = normalized.filter((o) => Boolean(o.voucher?.code));
  const withTracking = normalized.filter((o) => o.hasTrackingUrl);
  const joined = normalized.filter((o) => o.joined);

  const avgQuality = normalized.length > 0
    ? Math.round(normalized.reduce((s, o) => s + (o.qualityScore ?? 0), 0) / normalized.length)
    : 0;

  const placementCoverage = {};
  const allPlacements = [
    'home-deal-strip', 'category-after-intro', 'category-mid-content',
    'guide-after-intro', 'guide-mid-content', 'guide-bottom',
    'breed-before-faq', 'breed-bottom', 'brand-hero', 'brand-offer-grid',
  ];
  for (const p of allPlacements) {
    placementCoverage[p] = enabled.filter((o) => o.placements.includes(p)).length;
  }

  const stats = {
    total: normalized.length,
    enabled: enabled.length,
    active: active.length,
    expiringSoon: expiringSoon.length,
    upcoming: upcoming.length,
    expired: expired.length,
    promotions: normalized.filter((o) => o.type === 'promotion').length,
    vouchers: vouchers.length,
    withVoucherCode: withCode.length,
    withTrackingUrl: withTracking.length,
    joined: joined.length,
    notJoined: normalized.length - joined.length,
    avgQualityScore: avgQuality,
    placementCoverage,
    syncedAt: new Date().toISOString(),
    fetchMeta: meta,
  };

  writeJson(join(DATA, 'awin-offers.raw.json'), raw);
  writeJson(join(DATA, 'awin-offers.normalized.json'), normalized);
  writeJson(join(DATA, 'awin-offers.stats.json'), stats);

  console.log(`[write-promotions] Wrote ${raw.length} raw, ${normalized.length} normalized, ${enabled.length} enabled`);
  return stats;
}

/** Write empty placeholder files — called when sync is disabled or fetch fails */
export function writeEmptyOffers() {
  const stats = {
    total: 0, enabled: 0, active: 0, expiringSoon: 0, upcoming: 0, expired: 0,
    promotions: 0, vouchers: 0, withVoucherCode: 0, withTrackingUrl: 0,
    joined: 0, notJoined: 0, avgQualityScore: 0, placementCoverage: {},
    syncedAt: new Date().toISOString(),
  };
  writeJson(join(DATA, 'awin-offers.raw.json'), []);
  writeJson(join(DATA, 'awin-offers.normalized.json'), []);
  writeJson(join(DATA, 'awin-offers.stats.json'), stats);
  console.log('[write-promotions] Wrote empty offer placeholders');
}
