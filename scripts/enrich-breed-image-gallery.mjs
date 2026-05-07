#!/usr/bin/env node
/**
 * scripts/enrich-breed-image-gallery.mjs
 *
 * Populates 5-image galleries in master-breeds.json and master-crossbreeds.json.
 *
 * Primary source: Pexels API (high-quality, multi-size, accurate breed images).
 * Fallback:       Dog CEO API (free, no key required, breed-specific).
 *
 * For mixed/designer breeds: searches Pexels by the actual designer breed name
 * (e.g. "Goldendoodle") instead of parent breed images — resulting in real,
 * breed-specific photos every time.
 *
 * Written fields per breed:
 *   image_url            — primary display URL (large2x or large)
 *   image_urls           — string[] of primary URLs (one per gallery item)
 *   image_gallery        — rich gallery objects with multi-size URLs
 *   image_alt            — descriptive alt text
 *   image_source         — "pexels" | "dog-ceo-api-gallery" | "dog-ceo-api-parent-gallery" | …
 *   image_render_ready   — true
 *   image_render_format  — "direct-image-gallery"
 *   enrichment.*         — image metadata flags
 *   data_provenance.*    — pipeline audit trail
 *
 * Usage:
 *   node scripts/enrich-breed-image-gallery.mjs
 *   node scripts/enrich-breed-image-gallery.mjs --force
 *   node scripts/enrich-breed-image-gallery.mjs --slug goldendoodle --force
 *   node scripts/enrich-breed-image-gallery.mjs --target breeds
 *   node scripts/enrich-breed-image-gallery.mjs --target crossbreeds
 *   node scripts/enrich-breed-image-gallery.mjs --count 5
 *   node scripts/enrich-breed-image-gallery.mjs --dry
 *   node scripts/enrich-breed-image-gallery.mjs --pexels-only
 *   node scripts/enrich-breed-image-gallery.mjs --dogceo-only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadPexelsKey,
  buildBreedQueries,
  buildCrossbreedQueries,
  fetchBestBreedPhotos,
  normalizeBreedPhoto,
} from './lib/pexels.mjs';
import {
  buildDogCeoRandomImagesUrl,
  resolveDogCeoPath,
} from './lib/dog-ceo-breed-map.mjs';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const MASTER_BREEDS_PATH = path.join(DATA_DIR, 'master-breeds.json');
const MASTER_CROSSBREEDS_PATH = path.join(DATA_DIR, 'master-crossbreeds.json');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

const FORCE = args.includes('--force');
const DRY = args.includes('--dry');
const PEXELS_ONLY = args.includes('--pexels-only');
const DOGCEO_ONLY = args.includes('--dogceo-only');

function argValue(name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const SLUG = argValue('--slug');
const TARGET = argValue('--target', 'all');
const COUNT = Math.max(1, Math.min(Number(argValue('--count', 5)) || 5, 10));
const DELAY = Number(argValue('--delay', 220)) || 220;
const PER_QUERY = Number(argValue('--per-query', 15)) || 15;

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;
const B = (s) => `\x1b[34m${s}\x1b[0m`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

function readJson(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// Dog CEO helpers (fallback)
// ---------------------------------------------------------------------------

async function fetchJsonWithRetry(url, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) await sleep(500 * (attempt + 1));
    }
  }
  throw lastError;
}

function normalizeDogCeoResponse(payload) {
  if (!payload || payload.status !== 'success') return [];
  if (Array.isArray(payload.message)) return payload.message.filter((u) => typeof u === 'string');
  if (typeof payload.message === 'string') return [payload.message];
  return [];
}

function uniqueUrls(urls) {
  const seen = new Set();
  return urls
    .filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
    .filter((u) => { if (seen.has(u)) return false; seen.add(u); return true; });
}

async function fetchDogCeoImages(dogCeoPath, count) {
  if (!dogCeoPath) return [];
  try {
    const payload = await fetchJsonWithRetry(buildDogCeoRandomImagesUrl(dogCeoPath, count));
    return uniqueUrls(normalizeDogCeoResponse(payload));
  } catch {
    return [];
  }
}

function existingGalleryUrls(breed) {
  const fromGallery = Array.isArray(breed.image_gallery)
    ? breed.image_gallery.map((item) => item?.url || item?.image_url).filter(Boolean)
    : [];
  const fromUrls = Array.isArray(breed.image_urls) ? breed.image_urls : [];
  const single = breed.image_url ? [breed.image_url] : [];
  const candidates = Array.isArray(breed.image_url_candidates)
    ? breed.image_url_candidates.map((item) => item.image_url).filter(Boolean)
    : [];
  const parents = [breed.image_url_parent_1, breed.image_url_parent_2].filter(Boolean);
  return uniqueUrls([...fromGallery, ...fromUrls, ...single, ...candidates, ...parents]);
}

// ---------------------------------------------------------------------------
// Gallery application
// ---------------------------------------------------------------------------

/**
 * Build Dog CEO-style gallery items from plain URL strings.
 */
function makeDogCeoGalleryItems(urls, meta) {
  return urls.slice(0, COUNT).map((url, index) => ({
    url,
    card_url: null,
    thumb_url: null,
    hero_url: url,
    portrait_url: null,
    landscape_url: null,
    source: meta.source,
    role: index === 0 ? 'primary' : 'supporting',
    dog_ceo_path: meta.dogCeoPath || null,
    parent_breed_slug: meta.parentSlug || null,
    parent_breed_name: meta.parentName || null,
  }));
}

/**
 * Apply a gallery to a breed object.
 * Works for both Pexels (rich) and Dog CEO (plain URL) gallery items.
 */
function applyGallery(breed, gallery, options = {}) {
  const primaryUrls = uniqueUrls(gallery.map((item) => item.url)).slice(0, COUNT);
  if (!primaryUrls.length) return false;

  breed.image_url = primaryUrls[0];
  breed.image_urls = primaryUrls;
  breed.image_gallery = gallery
    .filter((item) => primaryUrls.includes(item.url))
    .slice(0, COUNT);
  breed.image_source = options.source || gallery[0]?.source || 'unknown';
  breed.image_alt =
    options.alt || breed.image_alt || `${breed.name} dog breed image gallery`;
  breed.image_render_ready = true;
  breed.image_render_format = 'direct-image-gallery';

  breed.enrichment = breed.enrichment || {};
  breed.enrichment.image_verified = true;
  breed.enrichment.image_gallery_count = primaryUrls.length;
  breed.enrichment.image_render_ready = true;
  breed.enrichment.image_is_parent_fallback = options.isParentFallback || false;

  breed.data_provenance = breed.data_provenance || {};
  breed.data_provenance.image_gallery_enriched = true;
  breed.data_provenance.image_gallery_count = primaryUrls.length;
  breed.data_provenance.image_strategy = options.strategy || 'unknown';
  breed.data_provenance.image_source = options.source || 'unknown';
  // Keep legacy field name for backwards compat with any downstream consumers
  breed.data_provenance.dog_ceo_image_gallery_enriched =
    (options.source || '').includes('dog-ceo');
  breed.data_provenance.dog_ceo_image_strategy = options.strategy || null;

  return true;
}

// ---------------------------------------------------------------------------
// Pexels breed enrichment
// ---------------------------------------------------------------------------

async function enrichWithPexels(breed, queries, apiKey, isCrossbreed = false) {
  const results = await fetchBestBreedPhotos(queries, {
    breedName: breed.name,
    targetCount: COUNT,
    perQuery: PER_QUERY,
    apiKey,
  });

  if (!results.length) return null;

  const gallery = results.map(({ photo, query }, index) =>
    normalizeBreedPhoto(photo, {
      role: index === 0 ? 'primary' : 'supporting',
      query,
    })
  );

  const source = 'pexels';
  const strategy = isCrossbreed ? 'pexels_designer_breed' : 'pexels_breed';
  const altSuffix = isCrossbreed ? 'mixed breed image gallery' : 'dog breed image gallery';

  applyGallery(breed, gallery, {
    source,
    strategy,
    alt: `${breed.name} ${altSuffix}`,
  });

  return { status: 'updated', source: 'pexels', count: gallery.length };
}

// ---------------------------------------------------------------------------
// Pure breed enrichment
// ---------------------------------------------------------------------------

async function enrichPureBreed(breed, dogCeoBreedList, pexelsKey) {
  const alreadyHasEnough =
    !FORCE &&
    Array.isArray(breed.image_urls) &&
    breed.image_urls.length >= COUNT &&
    breed.image_source === 'pexels';

  if (alreadyHasEnough) {
    return { status: 'skip', reason: 'already has Pexels gallery' };
  }

  const hasAnyGallery =
    !FORCE &&
    Array.isArray(breed.image_urls) &&
    breed.image_urls.length >= COUNT;

  if (hasAnyGallery && DOGCEO_ONLY) {
    return { status: 'skip', reason: 'already has gallery (dogceo-only mode)' };
  }

  // ── Pexels (primary) ───────────────────────────────────────────────────
  if (!DOGCEO_ONLY && pexelsKey) {
    const queries = buildBreedQueries(breed);
    const result = await enrichWithPexels(breed, queries, pexelsKey, false);
    if (result) return result;
  }

  // ── Dog CEO (fallback) ─────────────────────────────────────────────────
  if (!PEXELS_ONLY) {
    const dogCeoPath = resolveDogCeoPath(
      { slug: breed.slug, name: breed.name },
      dogCeoBreedList
    );

    if (dogCeoPath) {
      const fetched = await fetchDogCeoImages(dogCeoPath, COUNT);
      const urls = uniqueUrls([...fetched, ...existingGalleryUrls(breed)]).slice(0, COUNT);

      if (urls.length) {
        const gallery = makeDogCeoGalleryItems(urls, {
          source: 'dog-ceo-api-gallery',
          dogCeoPath,
        });
        applyGallery(breed, gallery, {
          source: 'dog-ceo-api-gallery',
          strategy: 'dog_ceo_breed_gallery',
          alt: `${breed.name} dog breed image gallery`,
        });
        return { status: 'updated', source: 'dog-ceo', dogCeoPath, count: urls.length };
      }
    }

    // Existing URLs last resort
    const existingUrls = existingGalleryUrls(breed).slice(0, COUNT);
    if (existingUrls.length) {
      const gallery = makeDogCeoGalleryItems(existingUrls, {
        source: breed.image_source || 'existing-image-fallback',
      });
      applyGallery(breed, gallery, {
        source: breed.image_source || 'existing-image-fallback',
        strategy: 'existing_image_fallback',
      });
      return { status: 'fallback', reason: 'no API match — using existing URLs' };
    }
  }

  return { status: 'missing', reason: 'no images found from any source' };
}

// ---------------------------------------------------------------------------
// Parent breed refs (for Dog CEO crossbreed fallback)
// ---------------------------------------------------------------------------

function buildParentRefs(crossbreed) {
  const refs = [];

  if (Array.isArray(crossbreed.parent_breeds)) {
    for (const parent of crossbreed.parent_breeds) {
      if (parent?.slug || parent?.name) {
        refs.push({ slug: parent.slug, name: parent.name, position: parent.position || refs.length + 1 });
      }
    }
  }

  for (const pos of [1, 2]) {
    const slug = crossbreed[`origin_breed_${pos}_slug`];
    const name = crossbreed[`origin_breed_${pos}_name`];
    if (slug || name) refs.push({ slug, name, position: pos });
  }

  const seen = new Set();
  return refs.filter(({ slug, name }) => {
    const key = slug || name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Designer / mixed breed enrichment
// ---------------------------------------------------------------------------

async function enrichCrossbreed(crossbreed, dogCeoBreedList, pexelsKey) {
  const alreadyHasEnough =
    !FORCE &&
    Array.isArray(crossbreed.image_urls) &&
    crossbreed.image_urls.length >= COUNT &&
    crossbreed.image_source === 'pexels';

  if (alreadyHasEnough) {
    return { status: 'skip', reason: 'already has Pexels gallery' };
  }

  const hasAnyGallery =
    !FORCE &&
    Array.isArray(crossbreed.image_urls) &&
    crossbreed.image_urls.length >= COUNT;

  if (hasAnyGallery && DOGCEO_ONLY) {
    return { status: 'skip', reason: 'already has gallery (dogceo-only mode)' };
  }

  // ── Pexels (primary) — search by actual designer breed name ───────────
  if (!DOGCEO_ONLY && pexelsKey) {
    const queries = buildCrossbreedQueries(crossbreed);
    const result = await enrichWithPexels(crossbreed, queries, pexelsKey, true);
    if (result) return result;
  }

  // ── Dog CEO (fallback 1) — direct designer breed path if it exists ────
  if (!PEXELS_ONLY) {
    const directPath = resolveDogCeoPath(
      { slug: crossbreed.slug, name: crossbreed.name },
      dogCeoBreedList
    );

    if (directPath) {
      const urls = await fetchDogCeoImages(directPath, COUNT);
      if (urls.length) {
        const gallery = makeDogCeoGalleryItems(urls, {
          source: 'dog-ceo-api-gallery',
          dogCeoPath: directPath,
        });
        applyGallery(crossbreed, gallery, {
          source: 'dog-ceo-api-gallery',
          strategy: 'direct_designer_breed_gallery',
          alt: `${crossbreed.name} mixed breed image gallery`,
        });
        return { status: 'updated', source: 'dog-ceo-direct', dogCeoPath: directPath, count: urls.length };
      }
    }

    // ── Dog CEO (fallback 2) — parent breed images ───────────────────────
    const parents = buildParentRefs(crossbreed);
    const parentGallery = [];

    for (const parent of parents) {
      const parentPath = resolveDogCeoPath(parent, dogCeoBreedList);
      if (!parentPath) continue;
      const parentCount = parents.length > 1 ? Math.ceil(COUNT / parents.length) + 1 : COUNT;
      const urls = await fetchDogCeoImages(parentPath, parentCount);
      for (const url of urls) {
        parentGallery.push({
          url,
          card_url: null,
          thumb_url: null,
          hero_url: url,
          portrait_url: null,
          landscape_url: null,
          source: 'dog-ceo-api-parent-gallery',
          role: parentGallery.length === 0 ? 'primary' : 'supporting',
          dog_ceo_path: parentPath,
          parent_breed_slug: parent.slug || null,
          parent_breed_name: parent.name || null,
        });
      }
      await sleep(DELAY);
    }

    const parentUrls = uniqueUrls(
      [...parentGallery.map((i) => i.url), ...existingGalleryUrls(crossbreed)]
    ).slice(0, COUNT);

    if (parentUrls.length) {
      const finalGallery = parentUrls.map((url, index) => {
        const item = parentGallery.find((c) => c.url === url);
        return item || {
          url,
          card_url: null,
          thumb_url: null,
          hero_url: url,
          portrait_url: null,
          landscape_url: null,
          source: crossbreed.image_source || 'existing-parent-image-fallback',
          role: index === 0 ? 'primary' : 'supporting',
          dog_ceo_path: null,
          parent_breed_slug: null,
          parent_breed_name: null,
        };
      });

      applyGallery(crossbreed, finalGallery, {
        source: 'dog-ceo-api-parent-gallery',
        strategy: 'parent_breed_gallery_fallback',
        isParentFallback: true,
        alt: `${crossbreed.name} mixed breed guide image gallery`,
      });
      return { status: 'updated', source: 'dog-ceo-parents', count: parentUrls.length };
    }

    // ── Dog CEO (fallback 3) — generic mix collection ───────────────────
    const mixUrls = await fetchDogCeoImages('mix', COUNT);
    if (mixUrls.length) {
      const mixGallery = makeDogCeoGalleryItems(mixUrls, {
        source: 'dog-ceo-api-mix-fallback',
        dogCeoPath: 'mix',
      });
      applyGallery(crossbreed, mixGallery, {
        source: 'dog-ceo-api-mix-fallback',
        strategy: 'generic_mix_fallback',
        alt: `${crossbreed.name} mixed breed fallback image gallery`,
      });
      return { status: 'fallback', source: 'dog-ceo-mix', count: mixUrls.length };
    }
  }

  return { status: 'missing', reason: 'no images found from any source' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const pexelsKey = DOGCEO_ONLY ? '' : loadPexelsKey();

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  🐕 PupWiki Breed Image Gallery Enrichment (Pexels-first)');
  console.log(`  target=${TARGET}  count=${COUNT}  force=${FORCE}  dry=${DRY}`);
  console.log(`  pexels=${pexelsKey ? G('✓ key loaded') : Y('✗ no key — Dog CEO only')}  dogceo=${PEXELS_ONLY ? Y('disabled') : G('enabled')}`);
  console.log('════════════════════════════════════════════════════════════\n');

  // Dog CEO breed list (needed even in Pexels-only mode for any fallback logic)
  let dogCeoBreedList = {};
  if (!PEXELS_ONLY) {
    try {
      const payload = await fetchJsonWithRetry('https://dog.ceo/api/breeds/list/all');
      dogCeoBreedList = payload?.message || {};
    } catch (err) {
      console.warn(Y(`  ⚠ Dog CEO breed list unavailable: ${err.message}`));
    }
  }

  const masterBreeds = readJson(MASTER_BREEDS_PATH);
  const masterCrossbreeds = readJson(MASTER_CROSSBREEDS_PATH);

  const jobs = [];

  if (TARGET === 'all' || TARGET === 'breeds') {
    for (const breed of masterBreeds) {
      if (!SLUG || breed.slug === SLUG) jobs.push({ type: 'breed', item: breed });
    }
  }

  if (TARGET === 'all' || TARGET === 'crossbreeds') {
    for (const breed of masterCrossbreeds) {
      if (!SLUG || breed.slug === SLUG) jobs.push({ type: 'crossbreed', item: breed });
    }
  }

  const stats = { updated: 0, fallback: 0, skip: 0, missing: 0, failed: 0 };
  const sourceCount = {};

  for (const [index, job] of jobs.entries()) {
    try {
      const result =
        job.type === 'breed'
          ? await enrichPureBreed(job.item, dogCeoBreedList, pexelsKey)
          : await enrichCrossbreed(job.item, dogCeoBreedList, pexelsKey);

      stats[result.status] = (stats[result.status] || 0) + 1;
      if (result.source) sourceCount[result.source] = (sourceCount[result.source] || 0) + 1;

      const icon =
        result.status === 'updated'
          ? result.source === 'pexels'
            ? B('✦')
            : G('✓')
          : result.status === 'fallback'
            ? Y('◐')
            : result.status === 'skip'
              ? D('–')
              : R('✗');

      const detail = result.source
        ? `${result.source}${result.dogCeoPath ? ` (${result.dogCeoPath})` : ''} · ${result.count || 0} images`
        : result.reason || '';

      console.log(
        `  ${icon} ${String(index + 1).padStart(4)} / ${jobs.length}  ${job.type.padEnd(10)} ${job.item.slug.padEnd(44)} ${D(detail)}`
      );
    } catch (err) {
      stats.failed += 1;
      console.log(`  ${R('✗')} ${job.type.padEnd(10)} ${job.item.slug.padEnd(44)} ${R(err.message)}`);
    }

    // Throttle: respect Pexels rate limits (200 req/hr on free tier)
    await sleep(DELAY);
  }

  if (!DRY) {
    if (TARGET === 'all' || TARGET === 'breeds') writeJson(MASTER_BREEDS_PATH, masterBreeds);
    if (TARGET === 'all' || TARGET === 'crossbreeds') writeJson(MASTER_CROSSBREEDS_PATH, masterCrossbreeds);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  updated=${G(stats.updated)}  fallback=${Y(stats.fallback)}  skip=${D(stats.skip)}  missing=${R(stats.missing)}  failed=${R(stats.failed)}`);
  if (Object.keys(sourceCount).length) {
    console.log(`  sources: ${Object.entries(sourceCount).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  }
  console.log(`  ${DRY ? Y('Dry run — no files written') : G('Saved updated data files')}`);
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(R(err.stack || err.message));
  process.exit(1);
});
