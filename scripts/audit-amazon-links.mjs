#!/usr/bin/env node
/**
 * audit-amazon-links.mjs
 *
 * Static audit for Amazon affiliate link compliance and correctness.
 * Called by validate:ci — must pass before every production build.
 * Exits 0 on pass, 1 on failure.
 *
 * Run via: npm run amazon:links:audit
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function read(rel) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf8');
}

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  FAIL  ${msg}`);
  failures++;
}

function warn(msg) {
  console.warn(`  WARN  ${msg}`);
  warnings++;
}

function pass(msg) {
  console.log(`  ok    ${msg}`);
}

// ── Check 1: AmazonTextLinks.astro exists ─────────────────────────────────────
console.log('\n[ AmazonTextLinks component ]');
const textLinksComponent = read('src/components/amazon/AmazonTextLinks.astro');
if (!textLinksComponent) {
  fail('src/components/amazon/AmazonTextLinks.astro does not exist');
} else {
  pass('AmazonTextLinks.astro exists');

  if (textLinksComponent.includes('rel="nofollow sponsored"')) {
    pass('contains rel="nofollow sponsored"');
  } else {
    fail('missing rel="nofollow sponsored" on links');
  }

  if (textLinksComponent.includes('target="_blank"')) {
    pass('contains target="_blank"');
  } else {
    fail('missing target="_blank" on links');
  }

  if (textLinksComponent.includes('Amazon Associate')) {
    pass('contains Amazon Associate disclosure');
  } else {
    warn('no Amazon Associate disclosure text found');
  }

  // Check for banned promotional copy
  const banned = ['best deal', 'on sale', 'discount', 'save $', 'lowest price', 'best price', 'cheapest'];
  for (const phrase of banned) {
    if (textLinksComponent.toLowerCase().includes(phrase)) {
      fail(`banned promotional copy found: "${phrase}"`);
    }
  }
  pass('no banned promotional copy in component');
}

// ── Check 2: amazonTextLinks.ts exists ────────────────────────────────────────
console.log('\n[ amazonTextLinks utility ]');
const textLinksUtil = read('src/lib/commerce/amazon/amazonTextLinks.ts');
if (!textLinksUtil) {
  fail('src/lib/commerce/amazon/amazonTextLinks.ts does not exist');
} else {
  pass('amazonTextLinks.ts exists');

  if (textLinksUtil.includes('buildAmazonSearchUrl')) {
    pass('uses buildAmazonSearchUrl');
  } else {
    fail('does not call buildAmazonSearchUrl — links may not be valid Amazon URLs');
  }

  if (textLinksUtil.includes('AMAZON_ASSOCIATE_TAG')) {
    pass('references AMAZON_ASSOCIATE_TAG');
  } else {
    warn('AMAZON_ASSOCIATE_TAG not referenced — check tag is being passed through');
  }

  if (textLinksUtil.includes('nofollow sponsored')) {
    pass('rel value includes nofollow sponsored');
  } else {
    fail('missing "nofollow sponsored" rel in link output type');
  }
}

// ── Check 3: No hardcoded wrong associate tag ─────────────────────────────────
console.log('\n[ Associate tag correctness ]');
const CORRECT_TAG = 'aiexpertscorn-20';
const WRONG_TAGS = ['aiexpertscorn-21', 'aiexpertcorn-20', 'aiexpertscorner-20', 'yourstore-20'];

const filesToCheck = [
  'src/components/amazon/AmazonTextLinks.astro',
  'src/lib/commerce/amazon/amazonTextLinks.ts',
  'src/lib/amazon/amazonConfig.ts',
];

for (const rel of filesToCheck) {
  const content = read(rel);
  if (!content) continue;
  for (const wrong of WRONG_TAGS) {
    if (content.includes(wrong)) {
      fail(`Wrong associate tag "${wrong}" found in ${rel}`);
    }
  }
}
pass(`No wrong associate tags in checked files (correct tag: ${CORRECT_TAG})`);

// ── Check 4: AmazonProductCard does not render ratings/review counts ──────────
console.log('\n[ AmazonProductCard compliance ]');
const productCard = read('src/components/amazon/AmazonProductCard.astro');
if (!productCard) {
  warn('src/components/amazon/AmazonProductCard.astro not found — skipping check');
} else {
  const ratingPatterns = [
    /\{.*?product\.rating.*?\}/,
    /\{.*?product\.reviewCount.*?\}/,
    /review_count/,
    /amz-card__rating/,
  ];
  let ratingFound = false;
  for (const pattern of ratingPatterns) {
    if (pattern.test(productCard)) {
      ratingFound = true;
      fail(`AmazonProductCard renders rating/review data without PA API provenance: pattern ${pattern}`);
    }
  }
  if (!ratingFound) {
    pass('AmazonProductCard does not render rating or review count');
  }
}

// ── Check 5: guides/[slug].astro integrates AmazonTextLinks ─────────────────
console.log('\n[ Guides page integration ]');
const blogPage = read('src/pages/guides/[slug].astro');
if (!blogPage) {
  warn('src/pages/guides/[slug].astro not found — skipping');
} else {
  if (blogPage.includes('AmazonTextLinks')) {
    pass('guides/[slug].astro references AmazonTextLinks');
  } else {
    warn('guides/[slug].astro does not yet import AmazonTextLinks (integration pending)');
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log(`Failures: ${failures}  Warnings: ${warnings}`);
console.log(`─────────────────────────────────────────`);

if (failures > 0) {
  console.error('\nAmazon links audit FAILED — fix issues above before building');
  process.exit(1);
}

if (warnings > 0) {
  console.log('\nAmazon links audit PASSED with warnings');
} else {
  console.log('\nAmazon links audit PASSED');
}
