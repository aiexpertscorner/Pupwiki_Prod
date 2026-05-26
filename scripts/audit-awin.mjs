#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const readJson = (file, fallback) => {
  try { return JSON.parse(readFileSync(join(root, file), 'utf8')); }
  catch { return fallback; }
};

const programs = readJson('src/data/awin-programs.json', {});
const products = readJson('src/data/awin-products.json', []);
const bannersRegistry = readJson('src/data/affiliate-banners.json', { banners: [] });
const banners = Array.isArray(bannersRegistry) ? bannersRegistry : (bannersRegistry.banners || []);

const joined = programs.programs || [];
const pending = programs.pendingPrograms || [];
const summary = programs.summary || [];
const feedPrograms = summary.filter((program) => program.hasProductFeed);
const joinedFeedPrograms = joined.filter((program) => program.hasProductFeed);
const productPrograms = new Set(products.map((product) => product.programId || product.advertiserId).filter(Boolean));
const logoPrograms = summary.filter((program) => program.hasLogo || program.logoUrl);
const feedProducts = products.filter((product) => product.source === 'awin-product-feed');
const programFallbackProducts = products.filter((product) => product.source === 'awin-program-fallback');
const manualFallbackProducts = products.filter((product) => /manual|fallback/.test(String(product.source || '')));
const noOutputJoined = joined.filter((program) => {
  const key = program.key || program.advertiserId;
  return !productPrograms.has(key) && !productPrograms.has(program.advertiserId);
});

const warnings = [
  !programs.stats?.oauthTokenPresent ? 'AWIN_OAUTH2_TOKEN was not used/present during the last sync.' : null,
  !programs.stats?.productFeedKeyPresent ? 'AWIN_PRODUCT_FEED_API_KEY was not used/present during the last sync; product feeds may be fallback-only.' : null,
  products.length === 0 ? 'No AWIN products available for rendering.' : null,
  joined.length > 0 && feedProducts.length === 0 ? 'Joined programmes exist but no live feed products were imported.' : null,
  joinedFeedPrograms.length > 0 && feedProducts.length === 0 ? `${joinedFeedPrograms.length} joined programme(s) have feed IDs but imported 0 live feed products.` : null,
  noOutputJoined.length > 0 ? `${noOutputJoined.length} joined programmes have no product output; use logos, deeplinks, or manual creatives as fallback.` : null,
  programs.stats?.warnings?.length ? `${programs.stats.warnings.length} warning(s) were recorded during sync.` : null,
].filter(Boolean);

const stats = programs.stats || {};
const feedRowsFetched = stats.feedRowsFetched ?? 0;
const apiProductCount = stats.apiProducts ?? 0;

const failures = [
  strict && !programs.stats?.oauthTokenPresent ? 'Strict audit failed: last AWIN sync did not have AWIN_OAUTH2_TOKEN.' : null,
  strict && !programs.stats?.productFeedKeyPresent ? 'Strict audit failed: last AWIN sync did not have AWIN_PRODUCT_FEED_API_KEY.' : null,
  strict && joined.length === 0 ? 'Strict audit failed: no joined AWIN programmes were synced.' : null,
  strict && products.length === 0 ? 'Strict audit failed: no AWIN products were generated.' : null,
  strict && joinedFeedPrograms.length > 0 && feedProducts.length === 0
    ? `Strict audit failed: ${joinedFeedPrograms.length} joined programme(s) have product feeds but 0 live feed products were imported.`
    : null,
  strict && feedRowsFetched > 0 && apiProductCount === 0
    ? `Strict audit failed: ${feedRowsFetched} feed row(s) were fetched but 0 products were normalised (check parser or field mapping).`
    : null,
].filter(Boolean);

const report = {
  generatedAt: new Date().toISOString(),
  syncedAt: programs.syncedAt || null,
  note: programs.note || null,
  strict,
  programmes: {
    joined: joined.length,
    pending: pending.length,
    summary: summary.length,
    withProductFeed: feedPrograms.length,
    joinedWithProductFeed: joinedFeedPrograms.length,
    withLogo: logoPrograms.length,
    joinedWithoutProductOutput: noOutputJoined.length,
  },
  products: {
    total: products.length,
    fromFeed: feedProducts.length,
    programFallback: programFallbackProducts.length,
    manualFallback: manualFallbackProducts.length,
    missingImage: products.filter((product) => !product.image).length,
    missingUrl: products.filter((product) => !product.url).length,
    programCount: productPrograms.size,
  },
  banners: {
    total: banners.length,
    enabled: banners.filter((banner) => banner.enabled).length,
    fromCreativeApi: banners.filter((banner) => banner.source === 'awin-api').length,
    fromProgramLogo: banners.filter((banner) => banner.source === 'awin-program-logo').length,
    missingImageOrHtml: banners.filter((banner) => banner.type === 'image_link' && !(banner.imageSrc || banner.mobileImageSrc || banner.desktopImageSrc)).length,
  },
  syncStats: {
    oauthTokenPresent: Boolean(programs.stats?.oauthTokenPresent),
    productFeedKeyPresent: Boolean(programs.stats?.productFeedKeyPresent),
    feedListEndpointUsed: programs.stats?.feedListEndpointUsed || null,
    feedProductFetchFailures: programs.stats?.feedProductFetchFailures || 0,
    feedRowsFetched: feedRowsFetched,
    feedRowsNormalized: stats.feedRowsNormalized ?? 0,
    feedsWithRowsButZeroProducts: stats.feedsWithRowsButZeroProducts || [],
    experimentalCreativesEnabled: Boolean(programs.stats?.experimentalCreativesEnabled),
  },
  warnings,
  failures,
};

// ─── Offers summary (non-blocking) ────────────────────────────────────────
const offerStats = (() => {
  try {
    const raw = JSON.parse(readFileSync(join(root, 'src/data/awin-offers.stats.json'), 'utf8'));
    return raw;
  } catch { return null; }
})();

if (offerStats) {
  report.offers = {
    total: offerStats.total ?? 0,
    enabled: offerStats.enabled ?? 0,
    active: offerStats.active ?? 0,
    expiringSoon: offerStats.expiringSoon ?? 0,
    vouchers: offerStats.vouchers ?? 0,
    withVoucherCode: offerStats.withVoucherCode ?? 0,
    avgQualityScore: offerStats.avgQualityScore ?? 0,
    syncedAt: offerStats.syncedAt ?? null,
  };
}

console.log(JSON.stringify(report, null, 2));

if (failures.length) {
  process.exit(1);
}
