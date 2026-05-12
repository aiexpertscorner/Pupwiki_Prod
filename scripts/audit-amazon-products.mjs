/**
 * scripts/audit-amazon-products.mjs
 *
 * Audits src/data/product-index.json — the canonical Amazon product data source.
 * Replaces the old amazon-products.json / SiteStripe pipeline audit.
 *
 * Usage: npm run amazon:audit
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const productIndexPath = join(ROOT, 'src/data/product-index.json');
const auditOutputPath = join(ROOT, 'src/data/amazon-products-audit.json');
const publicImagesDir = join(ROOT, 'public/images/products');

const productIndex = JSON.parse(readFileSync(productIndexPath, 'utf8'));
const products = Object.values(productIndex);

const now = new Date();
const STALE_DAYS = 30;

const stats = {
  total: products.length,
  active: 0,
  withAsin: 0,
  withImage: 0,
  withLocalImage: 0,
  priceFresh: 0,
  priceStale: 0,
  priceMissing: 0,
  withRating: 0,
  withScore: 0,
  byCategory: {},
  asinMissing: [],
  imageMissing: [],
  priceStaleList: [],
};

for (const p of products) {
  if (p.active !== false) stats.active++;

  if (p.asin?.trim()) {
    stats.withAsin++;
  } else {
    stats.asinMissing.push(p.id);
  }

  if (p.image) {
    stats.withImage++;
  } else {
    stats.imageMissing.push(p.id);
  }

  const localPath = join(publicImagesDir, `${p.id}.jpg`);
  const localPathPng = join(publicImagesDir, `${p.id}.png`);
  if (p.local_image || existsSync(localPath) || existsSync(localPathPng)) {
    stats.withLocalImage++;
  }

  if (p.price_updated) {
    const updated = new Date(p.price_updated);
    const ageDays = (now - updated) / (1000 * 60 * 60 * 24);
    if (ageDays <= STALE_DAYS) {
      stats.priceFresh++;
    } else {
      stats.priceStale++;
      stats.priceStaleList.push({ id: p.id, updated: p.price_updated });
    }
  } else {
    stats.priceMissing++;
  }

  if (p.rating) stats.withRating++;
  if (p.score != null) stats.withScore++;

  const cat = p.category || 'unknown';
  stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
}

const audit = {
  generatedAt: now.toISOString(),
  source: 'product-index.json',
  summary: {
    total: stats.total,
    active: stats.active,
    withValidAsin: stats.withAsin,
    withImage: stats.withImage,
    withLocalImage: stats.withLocalImage,
    withRating: stats.withRating,
    withEditorialScore: stats.withScore,
    priceFresh: stats.priceFresh,
    priceStale: stats.priceStale,
    priceMissing: stats.priceMissing,
  },
  byCategory: stats.byCategory,
  asinMissing: stats.asinMissing,
  imageMissing: stats.imageMissing,
  priceStale: stats.priceStaleList,
};

writeFileSync(auditOutputPath, JSON.stringify(audit, null, 2) + '\n');

console.log('\n[audit-amazon-products] Amazon product audit (product-index.json)');
console.log(`  Total products   : ${stats.total}`);
console.log(`  Active           : ${stats.active}`);
console.log(`  With valid ASIN  : ${stats.withAsin}  (${stats.asinMissing.length} missing)`);
console.log(`  With image URL   : ${stats.withImage}`);
console.log(`  With local image : ${stats.withLocalImage}`);
console.log(`  With rating      : ${stats.withRating}`);
console.log(`  With score       : ${stats.withScore}`);
console.log(`  Price fresh (<${STALE_DAYS}d): ${stats.priceFresh}`);
console.log(`  Price stale (>${STALE_DAYS}d): ${stats.priceStale}`);
console.log(`  Price missing    : ${stats.priceMissing}`);
console.log('\n  By category:');
for (const [cat, n] of Object.entries(stats.byCategory).sort()) {
  console.log(`    ${String(cat).padEnd(14)} ${n}`);
}
if (stats.asinMissing.length > 0) {
  console.log(`\n  ⚠  ASIN missing for: ${stats.asinMissing.join(', ')}`);
}
if (stats.priceStale > 0) {
  console.log(`\n  ⚠  ${stats.priceStale} products have stale prices (>${STALE_DAYS} days old)`);
}
console.log(`\n  Audit written: src/data/amazon-products-audit.json\n`);
