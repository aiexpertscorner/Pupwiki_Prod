/**
 * scripts/audit-routing.mjs
 *
 * Audits internal routing links in breed-link-map.json against actual guide
 * post slugs. Optionally fixes mismatches and syncs content-status.json.
 *
 * Usage:
 *   node scripts/audit-routing.mjs          # audit only, writes routing-audit.json
 *   node scripts/audit-routing.mjs --fix    # audit + apply fixes in-place
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FIX_MODE = process.argv.includes('--fix');

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ─── load data ───────────────────────────────────────────────────────────────

const linkMapPath = join(ROOT, 'src/data/breed-link-map.json');
const contentStatusPath = join(ROOT, 'src/data/content-status.json');
const guidesDir = join(ROOT, 'src/content/guides');
const redirectsPath = join(ROOT, 'public/_redirects');

const linkMap = readJSON(linkMapPath);
const contentStatus = readJSON(contentStatusPath);

const actualSlugs = new Set(
  readdirSync(guidesDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
);

// ─── slug correction rules ────────────────────────────────────────────────────

const GUIDE_LINK_TYPES = [
  'food_post',
  'toy_post',
  'bed_post',
  'grooming_post',
  'training_post',
  'supplement_post',
  'health_post',
];

/** Returns the correct slug if a guide post exists for this breed+type, else null */
function resolveCorrectSlug(breed, linkType) {
  const candidates = [];
  if (linkType === 'food_post') candidates.push(`best-dog-food-for-${breed}`);
  if (linkType === 'toy_post') candidates.push(`best-toy-for-${breed}`);
  if (linkType === 'bed_post') candidates.push(`best-bed-for-${breed}`);
  if (linkType === 'grooming_post') candidates.push(`best-grooming-for-${breed}`);
  if (linkType === 'training_post') candidates.push(`training-a-${breed}`);
  if (linkType === 'supplement_post') candidates.push(`best-supplements-for-${breed}`);
  if (linkType === 'health_post') candidates.push(`${breed}-health-problems`);
  return candidates.find((c) => actualSlugs.has(c)) ?? null;
}

// ─── audit broken links (map has URL but URL is wrong) ───────────────────────

const broken = [];    // { breed, linkType, mapSlug, correctSlug|null }
const correct = [];   // already fine

for (const [breed, links] of Object.entries(linkMap)) {
  for (const linkType of GUIDE_LINK_TYPES) {
    const url = links[linkType];
    if (!url) continue;  // null/missing — handled separately below

    const mapSlug = url.replace('/guides/', '').replace('/blog/', '').replace(/^\//, '').replace(/\/$/, '');
    if (actualSlugs.has(mapSlug)) {
      correct.push({ breed, linkType, url });
      continue;
    }

    const correctSlug = resolveCorrectSlug(breed, linkType);
    broken.push({ breed, linkType, mapUrl: url, mapSlug, correctSlug });
  }
}

// ─── audit orphaned posts (guide file exists but map has null for that type) ──

const orphaned = [];  // { breed, linkType, correctSlug } — post exists, map is null

for (const [breed, links] of Object.entries(linkMap)) {
  for (const linkType of GUIDE_LINK_TYPES) {
    if (links[linkType]) continue;  // already has a URL (handled above)
    const correctSlug = resolveCorrectSlug(breed, linkType);
    if (correctSlug) {
      orphaned.push({ breed, linkType, correctSlug });
    }
  }
}

const fixable = broken.filter((b) => b.correctSlug !== null);
const trulymissing = broken.filter((b) => b.correctSlug === null);

// ─── report ───────────────────────────────────────────────────────────────────

const byType = {};
for (const lt of GUIDE_LINK_TYPES) {
  byType[lt] = {
    broken: broken.filter((b) => b.linkType === lt).length,
    fixable: fixable.filter((b) => b.linkType === lt).length,
    missingNoContent: trulymissing.filter((b) => b.linkType === lt).length,
    orphaned: orphaned.filter((b) => b.linkType === lt).length,
    correct: correct.filter((b) => b.linkType === lt).length,
  };
}

const audit = {
  generatedAt: new Date().toISOString(),
  mode: FIX_MODE ? 'fix' : 'audit',
  summary: {
    brokenLinks: broken.length,
    fixableWrongPattern: fixable.length,
    missingNoContent: trulymissing.length,
    orphanedPostsToAdd: orphaned.length,
    alreadyCorrect: correct.length,
  },
  byType,
  fixableItems: fixable.map(({ breed, linkType, mapSlug, correctSlug }) => ({
    breed, linkType, from: mapSlug, to: correctSlug,
  })),
  orphanedItems: orphaned.map(({ breed, linkType, correctSlug }) => ({
    breed, linkType, slug: correctSlug,
  })),
  missingItems: trulymissing.map(({ breed, linkType, mapSlug }) => ({
    breed, linkType, slug: mapSlug,
  })),
};

const auditPath = join(ROOT, 'src/data/routing-audit.json');
writeJSON(auditPath, audit);

console.log('\n[audit-routing] Internal routing audit');
console.log(`  Broken (wrong URL)      : ${broken.length}`);
console.log(`    fixable (wrong pattern): ${fixable.length}`);
console.log(`    missing (no content)  : ${trulymissing.length}`);
console.log(`  Orphaned (null → add)   : ${orphaned.length}`);
console.log(`  Already correct         : ${correct.length}`);
console.log('\n  By type:');
for (const [lt, s] of Object.entries(byType)) {
  console.log(`    ${lt.padEnd(18)} broken=${s.broken} fixable=${s.fixable} missing=${s.missingNoContent} orphaned=${s.orphaned} ok=${s.correct}`);
}
console.log(`\n  Audit written: src/data/routing-audit.json`);

if (!FIX_MODE) {
  console.log('\n  Run with --fix to apply corrections.\n');
  process.exit(0);
}

// ─── fix 1: breed-link-map.json — correct wrong URLs ─────────────────────────

let fixedCount = 0;
for (const { breed, linkType, correctSlug } of fixable) {
  if (linkMap[breed]) {
    linkMap[breed][linkType] = `/guides/${correctSlug}`;
    fixedCount++;
  }
}
// Add orphaned posts (map had null but file exists)
let addedCount = 0;
for (const { breed, linkType, correctSlug } of orphaned) {
  if (linkMap[breed]) {
    linkMap[breed][linkType] = `/guides/${correctSlug}`;
    addedCount++;
  }
}
writeJSON(linkMapPath, linkMap);
console.log(`\n[audit-routing] breed-link-map.json: corrected ${fixedCount} URLs, added ${addedCount} missing entries`);

// ─── fix 2: content-status.json — sync flags to reality ─────────────────────

let statusFalse = 0;
let statusTrue = 0;

// Set to false where no guide post exists (was true but URL is broken/missing)
for (const { breed, linkType } of trulymissing) {
  if (!contentStatus[breed]) contentStatus[breed] = {};
  if (contentStatus[breed][linkType] !== false) {
    contentStatus[breed][linkType] = false;
    statusFalse++;
  }
}
// Set to true for newly added orphaned posts
for (const { breed, linkType } of orphaned) {
  if (!contentStatus[breed]) contentStatus[breed] = {};
  if (contentStatus[breed][linkType] !== true) {
    contentStatus[breed][linkType] = true;
    statusTrue++;
  }
}
writeJSON(contentStatusPath, contentStatus);
console.log(`[audit-routing] content-status.json: set ${statusFalse} flags → false, ${statusTrue} flags → true`);

// ─── fix 3: _redirects — 301s for wrong slugs that may be indexed ────────────

const existingRedirects = existsSync(redirectsPath)
  ? readFileSync(redirectsPath, 'utf8')
  : '';

const newRedirectLines = [];
for (const { mapSlug, correctSlug } of fixable) {
  const from = `/guides/${mapSlug}`;
  const to = `/guides/${correctSlug}`;
  if (!existingRedirects.includes(from)) {
    newRedirectLines.push(`${from}  ${to}  301`);
  }
}

if (newRedirectLines.length > 0) {
  const block = '\n# Guides slug redirects — generated by audit-routing.mjs\n'
    + newRedirectLines.join('\n') + '\n';
  writeFileSync(redirectsPath, existingRedirects.trimEnd() + block, 'utf8');
  console.log(`[audit-routing] public/_redirects: added ${newRedirectLines.length} redirect rules`);
} else {
  console.log('[audit-routing] public/_redirects: no new redirect rules needed');
}

console.log('\n  Done.\n');
