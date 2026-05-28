#!/usr/bin/env node
/**
 * scripts/enrich-content-images.mjs
 *
 * Adds smart Pexels hero images to guide posts with safe build fallbacks.
 *
 * Usage:
 *   node scripts/enrich-content-images.mjs --apply
 *   node scripts/enrich-content-images.mjs --apply --force
 *   node scripts/enrich-content-images.mjs --limit 40
 *   node scripts/enrich-content-images.mjs --dry
 *
 * Env:
 *   PEXELS_API_KEY=<secret>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES_DIR = path.join(ROOT, 'src', 'content', 'guides');
const BREEDS_PATH = path.join(ROOT, 'src', 'data', 'master-breeds.json');
const CROSSBREEDS_PATH = path.join(ROOT, 'src', 'data', 'master-crossbreeds.json');
const CACHE_PATH = path.join(ROOT, 'src', 'data', 'image-cache', 'pexels-content-images.json');

loadLocalEnv();

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');
const DRY = args.includes('--dry') || !APPLY;
const LIMIT = Math.max(1, Number(argValue('--limit', '80')) || 80);
const DELAY = Math.max(80, Number(argValue('--delay', '220')) || 220);
const KEY = process.env.PEXELS_API_KEY || '';

function argValue(name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

function loadLocalEnv() {
  for (const fileName of ['.env', '.env.local']) {
    const file = path.join(ROOT, fileName);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      if (process.env[key] != null) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[key] = value;
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  return {
    raw: text.slice(4, end),
    body: text.slice(end + 4).replace(/^\r?\n/, ''),
  };
}

function getYamlValue(raw, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const match = raw.match(re);
  if (!match) return '';
  return unquote(match[1].trim());
}

function setYaml(raw, updates) {
  const lines = raw.split(/\r?\n/);
  const used = new Set();
  const output = lines.map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (!match) return line;
    const key = match[1];
    if (!(key in updates)) return line;
    used.add(key);
    return `${key}: ${updates[key]}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!used.has(key)) output.push(`${key}: ${value}`);
  }
  return output.join('\n');
}

function quote(value) {
  return `"${String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function unquote(value) {
  const raw = String(value || '').trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) return raw.slice(1, -1);
  return raw;
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleCase(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeCategory(value) {
  const key = slugify(value);
  if (key.includes('food')) return 'dog food';
  if (key.includes('training') || key.includes('gear')) return 'dog training';
  if (key.includes('toy')) return 'dog toys';
  if (key.includes('bed')) return 'dog bed';
  if (key.includes('groom')) return 'dog grooming';
  if (key.includes('health')) return 'veterinarian dog health';
  if (key.includes('supplement')) return 'dog supplements';
  if (key.includes('lifestyle') || key.includes('gift')) return 'dog owner lifestyle';
  return 'dog care';
}

function inferBreed(post, breedsBySlug) {
  const explicit = getYamlValue(post.fm, 'breedSlug') || getYamlValue(post.fm, 'breed_slug');
  if (explicit && breedsBySlug.has(explicit)) return breedsBySlug.get(explicit);
  const haystack = `${post.slug} ${getYamlValue(post.fm, 'title')} ${getYamlValue(post.fm, 'tags')}`.toLowerCase();
  for (const [slug, breed] of breedsBySlug.entries()) {
    if (haystack.includes(slug)) return breed;
  }
  return null;
}

function buildQuery(post, breed) {
  const title = getYamlValue(post.fm, 'title') || titleCase(post.slug);
  const category = normalizeCategory(getYamlValue(post.fm, 'category'));
  const postType = slugify(getYamlValue(post.fm, 'postType'));

  if (breed?.name) {
    const breedName = breed.name;
    if (category.includes('food')) return `${breedName} dog eating healthy food`;
    if (category.includes('training')) return `${breedName} dog training outdoors`;
    if (category.includes('toy')) return `${breedName} dog playing toy`;
    if (category.includes('bed')) return `${breedName} dog sleeping bed`;
    if (category.includes('groom')) return `${breedName} dog grooming`;
    if (category.includes('health')) return `${breedName} dog veterinarian wellness`;
    if (category.includes('supplement')) return `${breedName} healthy dog wellness`;
    return `${breedName} dog portrait`;
  }

  if (postType.includes('comparison')) return `dog owner comparing ${category}`;
  if (postType.includes('how-to')) return `dog owner ${category}`;
  if (title.toLowerCase().includes('cost')) return 'dog owner planning budget pet costs';
  if (title.toLowerCase().includes('insurance')) return 'dog veterinarian insurance wellness';
  return category;
}

function scorePhoto(photo, query) {
  let score = 0;
  const width = Number(photo.width || 0);
  const height = Number(photo.height || 0);
  if (width >= 1200) score += 20;
  if (height >= 800) score += 10;
  if (width > height) score += 12;
  if (photo.alt && photo.alt.toLowerCase().includes('dog')) score += 12;
  if (photo.alt && query.split(/\s+/).some((term) => term.length > 4 && photo.alt.toLowerCase().includes(term))) score += 5;
  return score;
}

async function fetchPexels(query) {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', '12');
  url.searchParams.set('locale', 'en-US');
  const res = await fetch(url, {
    headers: { Authorization: KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.photos) ? data.photos : [];
}

function pickPhoto(photos, query) {
  return [...photos].sort((a, b) => scorePhoto(b, query) - scorePhoto(a, query))[0] || null;
}

function imageFromPhoto(photo) {
  return {
    url: photo.src?.large2x || photo.src?.large || photo.src?.original || '',
    alt: photo.alt || 'Dog care guide image',
    photographer: photo.photographer || '',
    photographerUrl: photo.photographer_url || '',
    pexelsUrl: photo.url || '',
    id: photo.id || null,
  };
}

const allBreeds = [...readJson(BREEDS_PATH, []), ...readJson(CROSSBREEDS_PATH, [])];
const breedsBySlug = new Map(allBreeds.filter((breed) => breed?.slug).map((breed) => [breed.slug, breed]));
const cache = readJson(CACHE_PATH, { syncedAt: null, images: {} });
cache.images ||= {};

if (!KEY) {
  console.warn('[pexels-images] PEXELS_API_KEY missing. Skipping image enrichment and preserving existing frontmatter.');
  process.exit(0);
}

const files = fs.readdirSync(GUIDES_DIR).filter((file) => file.endsWith('.md'));
let scanned = 0;
let changed = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  if (scanned >= LIMIT) break;
  const filePath = path.join(GUIDES_DIR, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFrontmatter(original);
  if (!parsed) continue;

  const slug = file.replace(/\.md$/, '');
  const currentImage = getYamlValue(parsed.raw, 'heroImage') || getYamlValue(parsed.raw, 'image');
  if (currentImage && !FORCE) { skipped++; continue; }

  scanned++;
  const post = { slug, fm: parsed.raw };
  const breed = inferBreed(post, breedsBySlug);
  const query = buildQuery(post, breed);
  const cacheKey = `${slug}:${query}`;

  try {
    let image = cache.images[cacheKey];
    if (!image) {
      const photos = await fetchPexels(query);
      const photo = pickPhoto(photos, query);
      if (!photo) throw new Error(`No Pexels photos for query: ${query}`);
      image = imageFromPhoto(photo);
      cache.images[cacheKey] = image;
      await sleep(DELAY);
    }

    if (!image?.url) throw new Error('Selected image has no URL');

    const updates = {
      heroImage: quote(image.url),
      image: quote(image.url),
      heroImageAlt: quote(image.alt),
      imageAlt: quote(image.alt),
      imageSource: quote('pexels'),
      imageCredit: quote(image.photographer ? `Photo by ${image.photographer} on Pexels` : 'Photo via Pexels'),
      imageCreditUrl: quote(image.pexelsUrl || image.photographerUrl || ''),
      imageSearchQuery: quote(query),
    };

    const nextFm = setYaml(parsed.raw, updates);
    const next = `---\n${nextFm}\n---\n\n${parsed.body}`;
    if (next !== original) {
      changed++;
      if (!DRY) fs.writeFileSync(filePath, next, 'utf8');
    }
    console.log(`[pexels-images] ✓ ${slug} -> ${query}`);
  } catch (error) {
    failed++;
    console.warn(`[pexels-images] WARN ${slug}: ${error.message}`);
  }
}

cache.syncedAt = new Date().toISOString();
cache.stats = { scanned, changed, skipped, failed, force: FORCE, dry: DRY };
if (!DRY) writeJson(CACHE_PATH, cache);

console.log(JSON.stringify({ apply: APPLY, force: FORCE, scanned, changed, skipped, failed }, null, 2));
