/**
 * validate-sitemaps.mjs
 * Validates all PupWiki sitemap files for structural correctness.
 * Exits non-zero only on serious structural failures.
 * Run: node scripts/seo/validate-sitemaps.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://pupwiki.com';

const REQUIRED_FILES = [
  'sitemap.xml',
  'sitemap-index.xml',
  'sitemap-breeds.xml',
  'sitemap-articles.xml',
  'sitemap-reviews.xml',
  'sitemap-guides.xml',
  'sitemap-categories.xml',
  'sitemap-faq.xml',
];

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  ✗ ERROR: ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ⚠ WARN:  ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

// Extract all <loc> values from an XML string
function extractLocs(xml) {
  const locs = [];
  const re = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    locs.push(m[1].trim());
  }
  return locs;
}

// Extract all <sitemap> entries (for index files)
function extractSitemapEntries(xml) {
  return (xml.match(/<sitemap>/g) || []).length;
}

console.log('\nPupWiki Sitemap Validator\n');

// 1. Check required files exist
console.log('─── Required files ───────────────────────────────────');
for (const file of REQUIRED_FILES) {
  const fullPath = path.join(PUBLIC, file);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${file}`);
  } else {
    const size = fs.statSync(fullPath).size;
    ok(`${file} (${(size / 1024).toFixed(1)} KB)`);
  }
}

// 2. Validate each non-index sitemap
console.log('\n─── URL validation ───────────────────────────────────');
const urlSitemaps = REQUIRED_FILES.filter(
  (f) => f !== 'sitemap.xml' && f !== 'sitemap-index.xml'
);

let totalUrls = 0;

for (const file of urlSitemaps) {
  const fullPath = path.join(PUBLIC, file);
  if (!fs.existsSync(fullPath)) continue;

  const xml = fs.readFileSync(fullPath, 'utf8');
  const locs = extractLocs(xml);

  // Check it has URL or sitemap entries
  const hasSitemapEntries = extractSitemapEntries(xml) > 0;
  if (locs.length === 0 && !hasSitemapEntries) {
    warn(`${file}: contains no <url> or <sitemap> entries`);
  }

  // Check for dynamic route placeholders
  const hasBracket = locs.some((l) => l.includes('[') || l.includes(']'));
  if (hasBracket) {
    fail(`${file}: contains dynamic route placeholder ([ or ]) in URL`);
  }

  // Check all locs start with site URL
  const badOrigin = locs.filter((l) => !l.startsWith(SITE));
  if (badOrigin.length > 0) {
    fail(`${file}: ${badOrigin.length} URL(s) do not start with ${SITE} (e.g. ${badOrigin[0]})`);
  }

  // Check for duplicates within this file
  const seen = new Set();
  const dupes = [];
  for (const loc of locs) {
    if (seen.has(loc)) dupes.push(loc);
    seen.add(loc);
  }
  if (dupes.length > 0) {
    warn(`${file}: ${dupes.length} duplicate URL(s) (e.g. ${dupes[0]})`);
  }

  // Warn if very few URLs
  if (locs.length > 0 && locs.length < 3) {
    warn(`${file}: only ${locs.length} URL(s) — may be unexpectedly thin`);
  }

  ok(`${file}: ${locs.length} URLs, 0 placeholders, ${dupes.length} dupes`);
  totalUrls += locs.length;
}

// 3. Validate sitemap index files
console.log('\n─── Index files ──────────────────────────────────────');
for (const file of ['sitemap.xml', 'sitemap-index.xml']) {
  const fullPath = path.join(PUBLIC, file);
  if (!fs.existsSync(fullPath)) continue;
  const xml = fs.readFileSync(fullPath, 'utf8');
  const locs = extractLocs(xml);
  const entries = extractSitemapEntries(xml);
  const badOrigin = locs.filter((l) => !l.startsWith(SITE));
  if (badOrigin.length > 0) {
    fail(`${file}: index entry does not start with ${SITE}`);
  }
  ok(`${file}: ${entries} sitemap entries`);
}

// 4. Summary
console.log('\n─── Summary ──────────────────────────────────────────');
console.log(`  Total URLs across segmented sitemaps: ${totalUrls}`);
console.log(`  Errors:   ${errors}`);
console.log(`  Warnings: ${warnings}`);

if (errors > 0) {
  console.error(`\n✗ Sitemap validation FAILED (${errors} error(s))\n`);
  process.exit(1);
} else {
  console.log(`\n✓ Sitemap validation passed${warnings > 0 ? ` (${warnings} warning(s))` : ''}\n`);
  process.exit(0);
}
