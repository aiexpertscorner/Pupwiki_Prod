/**
 * generate-sitemap.mjs
 * Generates segmented sitemaps for PupWiki:
 *   public/sitemap-index.xml      — master index
 *   public/sitemap-breeds.xml     — breed hubs, cost calculators, dog names (~weekly)
 *   public/sitemap-blog.xml       — blog posts (~weekly)
 *   public/sitemap-categories.xml — category hubs + static pages (~daily/weekly)
 *
 * Also writes public/sitemap.xml as a redirect-index for robots.txt compatibility.
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
// Note: 'insurance' omitted — /categories/insurance 301 redirects to /pet-insurance.
const legacyCategories = ['dog-food','toys','beds','health','training','grooming','supplements','smart-tech','travel','lifestyle'];
const clusters = loadClusterSlugs();
[...new Set([...legacyCategories, ...clusters])].forEach((c) => add(`/categories/${c}`, c === 'puppy' || c === 'senior-dogs' ? 0.88 : 0.84, 'weekly'));
add('/pet-insurance', 0.88, 'weekly');
add('/categories', 0.78, 'weekly');

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

function buildUrlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(2)}</priority>
  </url>`).join('\n')}
</urlset>`;
}

// Bucket all URLs by segment type
const all = [...urls.values()].sort((a, b) => a.loc.localeCompare(b.loc));

const breedUrls = all.filter((u) => /\/(breeds|cost-calculator|dog-names)\//.test(u.loc));
const blogUrls = all.filter((u) => u.loc.includes('/blog/'));
const categoryUrls = all.filter((u) => !breedUrls.includes(u) && !blogUrls.includes(u));

fs.mkdirSync(path.dirname(OUT), { recursive: true });

// Write segmented files
const BREEDS_OUT = path.join(ROOT, 'public', 'sitemap-breeds.xml');
const BLOG_OUT = path.join(ROOT, 'public', 'sitemap-blog.xml');
const CAT_OUT = path.join(ROOT, 'public', 'sitemap-categories.xml');
const INDEX_OUT = path.join(ROOT, 'public', 'sitemap-index.xml');

fs.writeFileSync(BREEDS_OUT, buildUrlset(breedUrls), 'utf8');
fs.writeFileSync(BLOG_OUT, buildUrlset(blogUrls), 'utf8');
fs.writeFileSync(CAT_OUT, buildUrlset(categoryUrls), 'utf8');

const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-breeds.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-blog.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-categories.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
</sitemapindex>`;

fs.writeFileSync(INDEX_OUT, sitemapIndex, 'utf8');

// Keep sitemap.xml as a redirect-index pointing to sitemap-index.xml for robots.txt
const legacyXml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Redirects to segmented sitemap index -->
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-breeds.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-blog.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-categories.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
</sitemapindex>`;
fs.writeFileSync(OUT, legacyXml, 'utf8');

console.log(`\n✓ Segmented sitemaps written to public/`);
console.log(`  sitemap-breeds.xml:     ${breedUrls.length} URLs`);
console.log(`  sitemap-blog.xml:       ${blogUrls.length} URLs`);
console.log(`  sitemap-categories.xml: ${categoryUrls.length} URLs`);
console.log(`  Total URLs: ${all.length}`);
console.log(`\nSubmit: https://pupwiki.com/sitemap.xml\n`);
