#!/usr/bin/env node
/**
 * Enrich homepage hero image data with Pexels photos.
 * Safe fallback: skips without failing when PEXELS_API_KEY is missing.
 *
 * Fetches multiple candidate photos per query (per_page=20), scores them,
 * and picks the best landscape image for each hero slot. Stores multiple
 * size variants so the frontend can serve the right resolution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadPexelsKey,
  searchPexels,
  scoreHeroPhoto,
  normalizeHeroPhoto,
} from './lib/pexels.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/data/home-hero-images.json');

const QUERIES = [
  'happy dog owner golden retriever outdoors',
  'family with dog at home lifestyle',
  'puppy playing in bright home',
  'senior dog owner outdoor portrait',
];
const LIMIT = 4;
const PER_QUERY = 20; // fetch more candidates for better selection

const KEY = loadPexelsKey();

// Skip enrichment if output file was updated within the last 7 days (unless FORCE=1)
function isFresh(filePath, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    const { mtimeMs } = fs.statSync(filePath);
    return Date.now() - mtimeMs < maxAgeMs;
  } catch {
    return false;
  }
}

async function fetchQuery(query) {
  // Prefer landscape for hero banners; fetch generous page for best scoring
  const photos = await searchPexels(
    query,
    { perPage: PER_QUERY, orientation: 'landscape' },
    KEY
  );
  if (!photos.length) return null;

  const best = photos
    .map((p) => ({ p, score: scoreHeroPhoto(p, query) }))
    .sort((a, b) => b.score - a.score)[0];

  return best?.p || null;
}

async function main() {
  if (!KEY) {
    console.warn('[hero-images] PEXELS_API_KEY missing. Keeping existing hero image data.');
    process.exit(0);
  }

  if (process.env.FORCE !== '1' && isFresh(OUT)) {
    console.log('[hero-images] Hero images are fresh (< 7 days). Skipping Pexels fetch.');
    process.exit(0);
  }

  const images = [];

  for (const query of QUERIES) {
    if (images.length >= LIMIT) break;
    try {
      const photo = await fetchQuery(query);
      if (photo?.src) images.push(normalizeHeroPhoto(photo, query, images.length));
    } catch (err) {
      console.warn(`[hero-images] ${err.message}`);
    }
  }

  if (!images.length) {
    console.warn('[hero-images] No Pexels hero images selected. Keeping existing data.');
    process.exit(0);
  }

  fs.writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'pexels',
        querySet: QUERIES,
        images,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`[hero-images] Wrote ${images.length} hero images to src/data/home-hero-images.json`);
}

main();
