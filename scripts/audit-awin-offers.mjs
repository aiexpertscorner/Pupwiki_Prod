#!/usr/bin/env node
/**
 * audit-awin-offers.mjs
 * Validates AWIN promotions/offers data files.
 * Use --strict to exit 1 on failures.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');

const STRICT = process.argv.includes('--strict');

const warnings = [];
const failures = [];

function warn(msg) { warnings.push(msg); console.warn(`  ⚠  ${msg}`); }
function fail(msg) { failures.push(msg); console.error(`  ✗  ${msg}`); }
function ok(msg)   { console.log(`  ✓  ${msg}`); }
function info(msg) { console.log(`     ${msg}`); }

function readJson(filePath, label) {
  if (!existsSync(filePath)) {
    fail(`${label} not found: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(`${label} is malformed JSON: ${e.message}`);
    return null;
  }
}

console.log('\nAWIN Offers Audit');
console.log('─'.repeat(50));

const raw = readJson(join(DATA, 'awin-offers.raw.json'), 'awin-offers.raw.json');
const normalized = readJson(join(DATA, 'awin-offers.normalized.json'), 'awin-offers.normalized.json');
const stats = readJson(join(DATA, 'awin-offers.stats.json'), 'awin-offers.stats.json');

if (!raw || !normalized || !stats) {
  console.error('\nAudit cannot proceed — missing required files.\n');
  process.exit(1);
}

if (!Array.isArray(raw)) fail('awin-offers.raw.json must be an array');
if (!Array.isArray(normalized)) fail('awin-offers.normalized.json must be an array');

// ─── Stats summary ────────────────────────────────────────────────────────
console.log('');
info(`Raw promotions fetched:       ${raw.length}`);
info(`Normalized offers:            ${normalized.length}`);
info(`Enabled:                      ${stats.enabled}`);
info(`Active / Expiring / Upcoming: ${stats.active} / ${stats.expiringSoon} / ${stats.upcoming}`);
info(`Expired (total):              ${stats.expired}`);
info(`Promotions / Vouchers:        ${stats.promotions} / ${stats.vouchers}`);
info(`With voucher code:            ${stats.withVoucherCode}`);
info(`With tracking URL:            ${stats.withTrackingUrl}`);
info(`Joined advertiser:            ${stats.joined}`);
info(`Not joined:                   ${stats.notJoined}`);
info(`Avg quality score:            ${stats.avgQualityScore}/100`);
info(`Synced at:                    ${stats.syncedAt ?? 'never'}`);

// ─── Hard failures ────────────────────────────────────────────────────────
console.log('');

const enabledOffers = normalized.filter((o) => o.enabled);

// Expired offers must not be enabled
const expiredEnabled = enabledOffers.filter((o) => o.isExpired);
if (expiredEnabled.length > 0) {
  fail(`${expiredEnabled.length} expired offer(s) are enabled`);
  expiredEnabled.slice(0, 3).forEach((o) => info(`  → ${o.id}: ended ${o.endDate}`));
}

// Unsafe offers must not be enabled
const unsafeEnabled = enabledOffers.filter((o) => o.safetyScore === 0);
if (unsafeEnabled.length > 0) {
  fail(`${unsafeEnabled.length} unsafe offer(s) are enabled`);
  unsafeEnabled.slice(0, 3).forEach((o) => info(`  → ${o.id}: ${o.title}`));
}

// Enabled offers must have a URL
const noUrlEnabled = enabledOffers.filter((o) => !o.bestUrl);
if (noUrlEnabled.length > 0) {
  fail(`${noUrlEnabled.length} enabled offer(s) have no URL`);
  noUrlEnabled.slice(0, 3).forEach((o) => info(`  → ${o.id}`));
}

// Enabled vouchers must have a code
const voucherNoCode = enabledOffers.filter((o) => o.type === 'voucher' && !o.voucher?.code);
if (voucherNoCode.length > 0) {
  fail(`${voucherNoCode.length} enabled voucher(s) have no code`);
  voucherNoCode.slice(0, 3).forEach((o) => info(`  → ${o.id}: ${o.title}`));
}

// ─── Warnings (non-fatal) ─────────────────────────────────────────────────

if (normalized.length === 0) {
  warn('Zero normalized offers — AWIN_FETCH_PROMOTIONS may not be set or no offers were returned');
}

if (stats.vouchers === 0) {
  warn('No voucher-type offers found');
}

if (stats.expiringSoon === 0 && normalized.length > 0) {
  warn('No expiring-soon offers — freshness widgets will not display');
}

const missingTrackingUrl = normalized.filter((o) => !o.hasTrackingUrl && o.enabled === false && o.joined);
if (missingTrackingUrl.length > 0) {
  warn(`${missingTrackingUrl.length} joined offer(s) disabled due to missing tracking URL`);
}

// ─── Placement coverage ───────────────────────────────────────────────────
console.log('');
console.log('  Placement coverage:');
const coverage = stats.placementCoverage ?? {};
const KEY_PLACEMENTS = [
  ['home-deal-strip', 'home'],
  ['category-after-intro', 'category'],
  ['guide-mid-content', 'guide'],
  ['breed-bottom', 'breed'],
  ['brand-hero', 'brand'],
];
for (const [placement, label] of KEY_PLACEMENTS) {
  const count = coverage[placement] ?? 0;
  const symbol = count > 0 ? '✓' : '○';
  console.log(`     ${symbol} ${label.padEnd(12)} (${placement}): ${count} offer(s)`);
}

// ─── Final result ─────────────────────────────────────────────────────────
console.log('');
console.log(`  Warnings: ${warnings.length}   Failures: ${failures.length}`);

if (failures.length === 0) {
  console.log('\n✅ AWIN offers audit passed\n');
} else {
  console.log('\n❌ AWIN offers audit FAILED\n');
}

if (STRICT && failures.length > 0) {
  process.exit(1);
}
