#!/usr/bin/env node
/**
 * scripts/enrich-homepage-guides.mjs
 *
 * Fetches Pexels landscape images for each featuredGuides item in homepage-config.json.
 * Requires PEXELS_API_KEY in .env or environment.
 *
 * Usage:
 *   PEXELS_API_KEY=xxx node scripts/enrich-homepage-guides.mjs
 *   node scripts/enrich-homepage-guides.mjs          # uses .env
 *   node scripts/enrich-homepage-guides.mjs --dry-run # preview without writing
 *
 * Per-guide queries and breed hints are defined in GUIDE_META below.
 * Results are written back to src/data/homepage-config.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPexelsKey, searchPexels, scoreHeroPhoto, scoreBreedPhoto } from './lib/pexels.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'src/data/homepage-config.json');
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Per-guide metadata: search queries + optional breed name for scoring
// ---------------------------------------------------------------------------
const GUIDE_META = {
  '/guides/first-dog': {
    queries: [
      'first time dog owner puppy home',
      'new puppy owner golden retriever',
      'dog owner happy lifestyle',
      'person with puppy dog',
    ],
    breedHint: 'golden retriever',
    description: 'First-dog guide',
  },
  '/cost-calculator/french-bulldog': {
    queries: [
      'French Bulldog dog breed',
      'French Bulldog puppy',
      'French Bulldog',
    ],
    breedHint: 'French Bulldog',
    description: 'French Bulldog cost guide',
  },
  '/guides/fi-series-4-gps-vs-tractive-gps-dog-4': {
    queries: [
      'dog running outdoors trail',
      'active dog outdoor adventure',
      'dog collar outdoor hiking',
      'border collie running field',
      'dog outside nature',
    ],
    breedHint: '',
    description: 'GPS tracker comparison',
  },
};

// Fallback queries if guide href not found in GUIDE_META
const FALLBACK_QUERY = 'happy dog lifestyle';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickBestPhoto(photos, breedHint, query) {
  if (!photos.length) return null;
  const scored = photos.map((p) => {
    const heroScore = scoreHeroPhoto(p, query);
    const breedScore = breedHint ? scoreBreedPhoto(p, breedHint, query) : 0;
    return { photo: p, score: heroScore + breedScore * 0.6 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].photo;
}

function extractLandscapeUrl(photo) {
  const src = photo.src || {};
  return src.landscape || src.large2x || src.large || src.original || '';
}

function extractAlt(photo, fallback) {
  return photo.alt && photo.alt.trim() ? photo.alt.trim() : fallback;
}

async function fetchImageForGuide(meta, usedIds, apiKey) {
  const { queries, breedHint, description } = meta;
  let best = null;
  let bestQuery = '';

  for (const query of queries) {
    let photos;
    try {
      photos = await searchPexels(query, { perPage: 20, orientation: 'landscape', size: 'large' }, apiKey);
    } catch (err) {
      console.warn(`  [warn] Pexels error for "${query}": ${err.message}`);
      continue;
    }

    // Filter already-used photo IDs to ensure variance
    const fresh = photos.filter((p) => !usedIds.has(p.id));
    if (!fresh.length) continue;

    const candidate = pickBestPhoto(fresh, breedHint, query);
    if (candidate) {
      best = candidate;
      bestQuery = query;
      break;
    }
  }

  if (!best) return null;

  usedIds.add(best.id);
  const imageUrl = extractLandscapeUrl(best);
  const imageAlt = extractAlt(best, description);
  return { imageUrl, imageAlt, pexelsId: best.id, query: bestQuery, photographer: best.photographer || '' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = loadPexelsKey();
  if (!apiKey) {
    console.error('\n✗ No PEXELS_API_KEY found in .env or environment.\n');
    console.error('  Set PEXELS_API_KEY=your_key in .env then re-run.\n');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const items = config?.featuredGuides?.items;

  if (!Array.isArray(items) || items.length === 0) {
    console.error('✗ No featuredGuides.items found in homepage-config.json');
    process.exit(1);
  }

  console.log(`\nEnriching ${items.length} featured guide(s) with Pexels images...\n`);

  const usedIds = new Set();
  let updated = 0;

  for (const item of items) {
    const meta = GUIDE_META[item.href] || { queries: [FALLBACK_QUERY], breedHint: '', description: item.title };
    console.log(`  → ${meta.description} (${item.href})`);

    const result = await fetchImageForGuide(meta, usedIds, apiKey);
    if (!result) {
      console.warn(`    [skip] No suitable Pexels image found — keeping existing imageUrl`);
      continue;
    }

    console.log(`    ✓ pexels_id=${result.pexelsId}, query="${result.query}", photographer="${result.photographer}"`);
    console.log(`      ${result.imageUrl.slice(0, 80)}...`);

    item.imageUrl = result.imageUrl;
    item.imageAlt = result.imageAlt;
    updated++;
  }

  console.log(`\n${updated}/${items.length} image(s) updated.`);

  if (DRY_RUN) {
    console.log('\n[dry-run] No changes written.\n');
    return;
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`✓ Wrote ${CONFIG_PATH}\n`);
  console.log('Next step: commit src/data/homepage-config.json and push.\n');
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err.message);
  process.exit(1);
});
