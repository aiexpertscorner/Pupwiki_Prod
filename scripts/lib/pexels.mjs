#!/usr/bin/env node
/**
 * scripts/lib/pexels.mjs
 *
 * Shared Pexels API utilities for breed image enrichment.
 * Handles authentication, search, scoring, and size normalization.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PEXELS_BASE = 'https://api.pexels.com/v1';
const FETCH_TIMEOUT = 18000;

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export function loadPexelsKey() {
  for (const name of ['.env', '.env.local']) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) continue;
      const m = clean.match(/^PEXELS_API_KEY\s*=\s*(.+)$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return v;
    }
  }
  return process.env.PEXELS_API_KEY || '';
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search Pexels for photos.
 *
 * @param {string} query
 * @param {{ perPage?: number, orientation?: 'landscape'|'portrait'|'square'|null, size?: 'large'|'medium'|'small'|null, page?: number }} options
 * @param {string} apiKey
 * @returns {Promise<object[]>} Pexels photo objects
 */
export async function searchPexels(query, options = {}, apiKey) {
  const { perPage = 15, orientation = null, size = null, page = 1 } = options;

  const url = new URL(`${PEXELS_BASE}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(Math.min(80, Math.max(1, perPage))));
  url.searchParams.set('page', String(page));
  url.searchParams.set('locale', 'en-US');
  if (orientation) url.searchParams.set('orientation', orientation);
  if (size) url.searchParams.set('size', size);

  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pexels HTTP ${res.status} for "${query}": ${body.slice(0, 120)}`);
  }

  const data = await res.json();
  return Array.isArray(data.photos) ? data.photos : [];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a Pexels photo for how well it matches a breed.
 * Higher = better.
 */
export function scoreBreedPhoto(photo, breedName, query = '') {
  let s = 0;
  const alt = String(photo.alt || '').toLowerCase();
  const breedTokens = breedName
    .toLowerCase()
    .replace(/[()]/g, '')
    .split(/[\s-]+/)
    .filter((t) => t.length > 3);

  // Dimension quality — prefer large images for hero display
  const w = photo.width || 0;
  if (w >= 4000) s += 30;
  else if (w >= 2000) s += 22;
  else if (w >= 1200) s += 14;
  else if (w >= 800) s += 6;

  // Breed name tokens in alt text
  for (const token of breedTokens) {
    if (alt.includes(token)) s += 20;
  }

  // "dog" anywhere in alt
  if (alt.includes('dog')) s += 14;
  if (alt.includes('puppy') || alt.includes('pup')) s += 6;

  // Query term coverage
  for (const token of query.toLowerCase().split(/\s+/)) {
    if (token.length > 4 && alt.includes(token)) s += 5;
  }

  // Prefer portrait/square for breed cards (subject fills frame)
  const h = photo.height || 1;
  if (w <= h) s += 10; // portrait or square

  // Penalise very small images
  if (w < 600) s -= 25;

  return s;
}

/**
 * Score a Pexels photo for lifestyle/hero use (landscape emphasis).
 */
export function scoreHeroPhoto(photo, query = '') {
  let s = 0;
  const alt = String(photo.alt || '').toLowerCase();

  if ((photo.width || 0) >= 1400) s += 20;
  if ((photo.width || 0) > (photo.height || 0)) s += 14; // landscape
  if (alt.includes('dog')) s += 20;
  if (alt.includes('person') || alt.includes('owner') || alt.includes('family')) s += 8;
  for (const token of query.toLowerCase().split(/\s+/)) {
    if (token.length > 4 && alt.includes(token)) s += 3;
  }

  return s;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a raw Pexels photo object into a gallery item with all size variants.
 *
 * Stored URL map (matching Pexels src keys):
 *   url        — large2x (display quality, ~940×650 @2x)
 *   card_url   — medium  (~500×350)
 *   thumb_url  — tiny    (~280×200)
 *   hero_url   — large2x or large
 *   portrait_url — portrait crop (~800×1200)
 *   landscape_url — landscape crop (~1200×627)
 *
 * @param {object} photo  raw Pexels photo
 * @param {object} meta   extra fields to merge (role, query, dog_ceo_path, etc.)
 * @returns {object}
 */
export function normalizeBreedPhoto(photo, meta = {}) {
  const src = photo.src || {};
  return {
    url: src.large2x || src.large || src.original || '',
    card_url: src.medium || src.small || '',
    thumb_url: src.tiny || src.small || '',
    hero_url: src.large2x || src.large || src.original || '',
    portrait_url: src.portrait || src.large || '',
    landscape_url: src.landscape || src.large2x || src.large || '',
    width: photo.width || null,
    height: photo.height || null,
    source: 'pexels',
    pexels_id: photo.id,
    photographer: photo.photographer || '',
    photographer_url: photo.photographer_url || '',
    pexels_url: photo.url || '',
    alt: photo.alt || '',
    // standard breed-gallery fields expected by BreedImage.astro
    role: meta.role || 'supporting',
    dog_ceo_path: meta.dog_ceo_path || null,
    parent_breed_slug: meta.parent_breed_slug || null,
    parent_breed_name: meta.parent_breed_name || null,
    query: meta.query || '',
  };
}

/**
 * Normalise a raw Pexels photo for homepage hero use.
 */
export function normalizeHeroPhoto(photo, query, index = 0) {
  const src = photo.src || {};
  return {
    id: `pexels-${photo.id}`,
    source: 'pexels',
    query,
    src: src.large2x || src.large || src.original,
    mobileSrc: src.large || src.medium || src.large2x || src.original,
    thumbSrc: src.tiny || src.small,
    alt: photo.alt || 'Happy dog lifestyle image',
    photographer: photo.photographer || '',
    photographerUrl: photo.photographer_url || '',
    url: photo.url || '',
    width: photo.width || null,
    height: photo.height || null,
    focal: index === 0 ? 'center' : index === 1 ? 'center 42%' : 'center',
  };
}

// ---------------------------------------------------------------------------
// Query builders
// ---------------------------------------------------------------------------

/**
 * Build ordered search queries for a pure breed.
 * Returns an array of query strings to try in sequence.
 */
export function buildBreedQueries(breed) {
  const name = (breed.name || '').trim();
  return [
    `${name} dog breed`,
    `${name} dog`,
    `${name}`,
  ];
}

/**
 * Build ordered search queries for a designer / mixed breed.
 * Uses the actual designer breed name first, NOT parent breed names.
 */
export function buildCrossbreedQueries(breed) {
  const name = (breed.name || '').trim();
  return [
    name,                   // e.g. "Goldendoodle"
    `${name} dog`,
    `${name} puppy`,
  ];
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch Pexels photos for a list of queries, stopping when we have enough
 * unique high-quality results.
 *
 * @param {string[]} queries        Ordered query list
 * @param {object}   options
 * @param {string}   options.breedName    Used for scoring
 * @param {number}   options.targetCount  How many photos we need (default 5)
 * @param {number}   options.perQuery     Results to request per query (default 15)
 * @param {number}   options.minScore     Minimum score to accept (default -Infinity)
 * @param {string}   options.apiKey
 * @param {number}   options.retries      Per-query retries (default 2)
 * @param {number}   options.retryDelay   ms between retries (default 600)
 * @returns {Promise<object[]>}  Array of raw Pexels photo objects
 */
export async function fetchBestBreedPhotos(queries, options = {}) {
  const {
    breedName = '',
    targetCount = 5,
    perQuery = 15,
    minScore = -Infinity,
    apiKey,
    retries = 2,
    retryDelay = 600,
  } = options;

  const seen = new Set();
  const results = [];

  for (const query of queries) {
    if (results.length >= targetCount) break;

    let photos = [];
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        photos = await searchPexels(query, { perPage: perQuery }, apiKey);
        break;
      } catch (err) {
        lastError = err;
        if (attempt < retries) await sleep(retryDelay * (attempt + 1));
      }
    }

    if (!photos.length && lastError) continue; // silent; next query

    // Score, deduplicate, filter
    const scored = photos
      .map((p) => ({ photo: p, score: scoreBreedPhoto(p, breedName, query) }))
      .filter(({ photo, score }) => !seen.has(photo.id) && score >= minScore)
      .sort((a, b) => b.score - a.score);

    for (const { photo } of scored) {
      if (results.length >= targetCount) break;
      seen.add(photo.id);
      results.push({ photo, query });
    }
  }

  return results; // [{ photo, query }]
}
