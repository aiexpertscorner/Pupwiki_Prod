/**
 * generate-sitemap.mjs
 * Generates public/sitemap.xml from real page/content inventory.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://pupwiki.com';
const TODAY = new Date().toISOString().split('T')[0];
const OUT = path.join(ROOT, 'public', 'sitemap.xml');

function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return fallback; }
}
function walk(dir, suffixes = []) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full, suffixes));
    else if (!suffixes.length || suffixes.some((suffix) => item.name.endsWith(suffix))) out.push(full);
  }
  return out;
}
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const raw = text.slice(4, end);
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[match[1]] = value;
  }
  return data;
}
function loadClusterSlugs() {
  const file = path.join(ROOT, 'src/lib/content/contentClusterConfig.ts');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  return Array.from(new Set([...text.matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((m) => m[1]).filter((slug) => slug !== 'slug')));
}

const breeds = readJson('src/data/master-breeds.json', []);
const crossbreeds = readJson('src/data/master-crossbreeds.json', []);
const status = readJson('src/data/content-status.json', {});
const backlog = readJson('src/data/pseo-opportunity-backlog.json', { items: [] });
const partnerSummary = readJson('src/data/pupwiki-partners-summary.json', { partners: [] });
const allBreeds = [...breeds, ...crossbreeds];
const urls = new Map();

function add(loc, priority = 0.6, changefreq = 'weekly', lastmod = TODAY) {
  if (!loc || loc.includes(':') || loc.includes('[')) return;
  const clean = loc === '/' ? '/' : loc.replace(/\/$/, '');
  urls.set(clean, { loc: `${SITE}${clean}`, priority, changefreq, lastmod });
}

// Core static pages.
add('/', 1.0, 'daily');
add('/breeds', 0.92, 'weekly');
add('/blog', 0.82, 'daily');
add('/categories', 0.74, 'weekly');
add('/dog-names', 0.82, 'weekly');
add('/cost-calculator', 0.9, 'weekly');
add('/about', 0.4, 'monthly');
add('/disclosure', 0.34, 'monthly');
add('/privacy', 0.3, 'monthly');
add('/contact', 0.35, 'monthly');
add('/how-we-test', 0.55, 'monthly');

// Category and cluster pages.
const legacyCategories = ['dog-food','toys','beds','health','training','grooming','supplements','smart-tech','travel','lifestyle'];
const clusters = loadClusterSlugs();
[...new Set([...legacyCategories, ...clusters])].forEach((c) => add(`/categories/${c}`, c === 'puppy' || c === 'senior-dogs' || c === 'insurance' ? 0.88 : 0.84, 'weekly'));

// Breed hubs and tools.
for (const breed of breeds) {
  add(`/breeds/${breed.slug}`, 0.9, 'weekly');
  add(`/cost-calculator/${breed.slug}`, 0.84, 'weekly');
  add(`/dog-names/${breed.slug}`, 0.74, 'monthly');
}
for (const breed of crossbreeds) {
  add(`/breeds/${breed.slug}`, 0.84, 'weekly');
  add(`/cost-calculator/${breed.slug}`, 0.78, 'weekly');
  add(`/dog-names/${breed.slug}`, 0.68, 'monthly');
}

// Existing generated breed cluster posts from content-status.
for (const breed of allBreeds) {
  const s = status[breed.slug] || {};
  if (s.food_post) add(`/blog/best-food-for-${breed.slug}`, 0.78, 'monthly');
  if (s.toy_post) add(`/blog/best-toys-for-${breed.slug}`, 0.72, 'monthly');
  if (s.bed_post) add(`/blog/best-bed-for-${breed.slug}`, 0.72, 'monthly');
  if (s.grooming_post) add(`/blog/best-grooming-for-${breed.slug}`, 0.68, 'monthly');
  if (s.health_post) add(`/blog/${breed.slug}-health-problems`, 0.66, 'monthly');
  if (s.supplement_post) add(`/blog/best-supplements-for-${breed.slug}`, 0.58, 'monthly');
  if (s.training_post) add(`/blog/training-a-${breed.slug}`, 0.68, 'monthly');
}

// Real blog markdown collection, including generated partner profiles.
const blogDir = path.join(ROOT, 'src/content/blog');
for (const file of walk(blogDir, ['.md'])) {
  const slug = path.basename(file, '.md');
  const data = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  if (String(data.noIndex || '').toLowerCase() === 'true') continue;
  if (String(data.noRoute || '').toLowerCase() === 'true') continue;
  const isPartner = slug.startsWith('partner-') || data.category === 'PupWiki Partners';
  const isGenerated = String(data.generated || '').toLowerCase() === 'true';
  const priority = isPartner ? 0.58 : isGenerated ? 0.62 : 0.72;
  const updated = data.updatedDate || data.pubDate || TODAY;
  add(`/blog/${slug}`, priority, isPartner ? 'monthly' : 'weekly', String(updated).slice(0, 10));
}

// Explicit partner summary pages, in case the markdown was generated in prebuild.
for (const partner of partnerSummary.partners || []) {
  if (partner.href) add(partner.href, 0.58, 'monthly');
}

// Opportunity backlog: include only existing route suggestions with exists=true.
for (const item of backlog.items || []) {
  if (item?.exists && item?.suggestedPath && item?.sitemap?.include) {
    add(item.suggestedPath, item.sitemap.priority || 0.62, item.sitemap.changefreq || 'monthly');
  }
}

const sorted = [...urls.values()].sort((a, b) => a.loc.localeCompare(b.loc));
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sorted.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(2)}</priority>
  </url>`).join('\n')}
</urlset>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, xml, 'utf8');

console.log(`\n✓ sitemap.xml written to public/`);
console.log(`  Total URLs: ${sorted.length}`);
console.log(`  Breed hubs: ${allBreeds.length}`);
console.log(`  Blog URLs: ${sorted.filter((u) => u.loc.includes('/blog/')).length}`);
console.log(`  Category URLs: ${sorted.filter((u) => u.loc.includes('/categories/')).length}`);
console.log(`  Name pages: ${sorted.filter((u) => u.loc.includes('/dog-names/')).length}`);
console.log(`\nSubmit: https://pupwiki.com/sitemap.xml\n`);
