#!/usr/bin/env node
/**
 * scripts/audit-seo-quality.mjs
 *
 * Phase 3 SEO Quality Guardrail Script
 *
 * Scans the repository and outputs a structured diagnostic log covering:
 *   1. Page inventory + URL depth per route type
 *   2. Content cluster coverage (orphan risk detection)
 *   3. Thin content detection (word count thresholds)
 *   4. Breadcrumb + schema coverage
 *   5. Internal link density sampling
 *   6. Sitemap vs. route coverage delta
 *
 * Usage:
 *   node scripts/audit-seo-quality.mjs
 *   node scripts/audit-seo-quality.mjs --json          # machine-readable output
 *   node scripts/audit-seo-quality.mjs --threshold 500 # custom word count threshold
 *   node scripts/audit-seo-quality.mjs --family food   # filter to one blog family
 *
 * Exit code: 0 = all checks passed, 1 = warnings found, 2 = critical issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const GUIDES_DIR = path.join(ROOT, 'src/content/guides');
const PAGES_DIR = path.join(ROOT, 'src/pages');
const DATA_DIR = path.join(ROOT, 'src/data');
const SITE = 'https://pupwiki.com';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const WORD_THRESHOLD = (() => {
  const idx = args.indexOf('--threshold');
  return idx !== -1 ? Number(args[idx + 1]) || 400 : 400;
})();
const FAMILY_FILTER = (() => {
  const idx = args.indexOf('--family');
  return idx !== -1 ? args[idx + 1] : null;
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readJson(rel, fallback = null) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return fallback; }
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { raw: '', body: text, data: {} };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { raw: '', body: text, data: {} };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).trim();
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    data[m[1]] = v;
  }
  return { raw, body, data };
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function walk(dir, ext = '.md') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full, ext));
    else if (item.name.endsWith(ext)) out.push(full);
  }
  return out;
}

function blogFamily(filename) {
  if (filename.startsWith('best-food-for-') || filename.startsWith('best-dog-food-for-')) return 'food';
  if (filename.startsWith('best-bed-for-')) return 'beds';
  if (filename.startsWith('best-toy-for-')) return 'toys';
  if (filename.startsWith('best-grooming-for-')) return 'grooming';
  if (filename.startsWith('training-a-')) return 'training';
  if (filename.startsWith('best-supplements-for-')) return 'supplements';
  if (filename.startsWith('names-for-') || filename.startsWith('best-names-for-')) return 'names';
  if (filename.includes('-health-problems')) return 'health';
  return 'editorial';
}

function severity(level) {
  return { CRITICAL: '🔴 CRITICAL', HIGH: '🟠 HIGH', MEDIUM: '🟡 MEDIUM', LOW: '🟢 LOW', OK: '✅ OK' }[level] || level;
}

// ---------------------------------------------------------------------------
// Load data sources
// ---------------------------------------------------------------------------
const masterBreeds = readJson('src/data/master-breeds.json', []);
const masterCrossbreeds = readJson('src/data/master-crossbreeds.json', []);
const contentStatus = readJson('src/data/content-status.json', {});
const breedLinkMap = readJson('src/data/breed-link-map.json', {});
const allBreeds = [...masterBreeds, ...masterCrossbreeds];

// ---------------------------------------------------------------------------
// 1. Page Inventory & URL Depth
// ---------------------------------------------------------------------------
const routeTypes = [
  { name: 'Breed hubs',        pattern: /^breeds\/[^/]+$/, depth: 3 },
  { name: 'Dog names',         pattern: /^dog-names\/[^/]+$/, depth: 3 },
  { name: 'Cost calculators',  pattern: /^cost-calculator\/[^/]+$/, depth: 3 },
  { name: 'Guide posts',        pattern: /^blog\/[^/]+$/, depth: 3 },
  { name: 'Category hubs',     pattern: /^categories\/[^/]+$/, depth: 3 },
  { name: 'Brand pages',       pattern: /^brands\/[^/]+$/, depth: 3 },
];

const pageInventory = {
  breeds: allBreeds.length,
  dogNames_purebred: masterBreeds.length,
  dogNames_crossbreed: masterCrossbreeds.length,
  dogNames_total_expected: allBreeds.length,
  dogNamesGap: masterCrossbreeds.length,
  costCalculators: allBreeds.length,
  blogPosts: walk(GUIDES_DIR).length,
};

// ---------------------------------------------------------------------------
// 2. Content Cluster Coverage (Orphan Risk)
// ---------------------------------------------------------------------------
const clusterKeys = ['food_post', 'toy_post', 'bed_post', 'grooming_post', 'training_post', 'supplement_post', 'health_post', 'names_page', 'cost_calculator'];

const clusterStats = {};
for (const key of clusterKeys) {
  const total = allBreeds.length;
  const covered = allBreeds.filter((b) => contentStatus[b.slug]?.[key] === true).length;
  const missing = total - covered;
  clusterStats[key] = { total, covered, missing, pct: Math.round((covered / total) * 100) };
}

const orphanRisks = allBreeds
  .filter((b) => {
    const s = contentStatus[b.slug] || {};
    const coreLinksOk = s.food_post || s.bed_post || s.training_post;
    const hasBreedPage = true; // all breeds have a hub
    return hasBreedPage && !coreLinksOk;
  })
  .map((b) => b.slug);

// ---------------------------------------------------------------------------
// 3. Thin Content Detection
// ---------------------------------------------------------------------------
const thinContent = [];
const wordCountByFamily = {};
const blogFiles = walk(GUIDES_DIR);
let scanned = 0;

for (const file of blogFiles) {
  const slug = path.basename(file, '.md');
  const family = blogFamily(slug);
  if (FAMILY_FILTER && family !== FAMILY_FILTER) continue;
  scanned++;

  const text = fs.readFileSync(file, 'utf8');
  const { body, data } = parseFrontmatter(text);
  if (data.noIndex === 'true' || data.noRoute === 'true') continue;
  if (data.generated !== 'true') continue; // only check generated posts

  const wc = countWords(body);
  if (!wordCountByFamily[family]) wordCountByFamily[family] = { count: 0, totalWords: 0, thin: 0 };
  wordCountByFamily[family].count++;
  wordCountByFamily[family].totalWords += wc;

  if (wc < WORD_THRESHOLD) {
    wordCountByFamily[family].thin++;
    thinContent.push({ slug, family, wordCount: wc });
  }
}

// ---------------------------------------------------------------------------
// 4. Breadcrumb + Schema Coverage (page template scan)
// ---------------------------------------------------------------------------
const pageFiles = walk(PAGES_DIR, '.astro');
const schemaCoverage = {
  breadcrumbList: [],
  noBreadcrumb: [],
  faqPage: [],
  howTo: [],
};

for (const file of pageFiles) {
  const rel = path.relative(PAGES_DIR, file);
  const content = fs.readFileSync(file, 'utf8');
  const hasBreadcrumb = content.includes('BreadcrumbList') || content.includes('Breadcrumb') || content.includes('breadcrumb');
  const hasFaq = content.includes('FAQPage');
  const hasHowTo = content.includes('HowTo');

  if (hasBreadcrumb) schemaCoverage.breadcrumbList.push(rel);
  else schemaCoverage.noBreadcrumb.push(rel);
  if (hasFaq) schemaCoverage.faqPage.push(rel);
  if (hasHowTo) schemaCoverage.howTo.push(rel);
}

// ---------------------------------------------------------------------------
// 5. Internal Link Density (sample 20 breed pages check via link_map)
// ---------------------------------------------------------------------------
const sampleBreeds = allBreeds.slice(0, 20);
const linkDensity = sampleBreeds.map((b) => {
  const links = breedLinkMap[b.slug] || {};
  const linkCount = Object.values(links).filter(Boolean).length;
  return { slug: b.slug, name: b.name, linkCount };
});
const avgLinks = linkDensity.reduce((s, b) => s + b.linkCount, 0) / linkDensity.length;
const lowLinkBreeds = linkDensity.filter((b) => b.linkCount < 3).map((b) => b.slug);

// ---------------------------------------------------------------------------
// 6. Duplicate AWIN Block Detection
// ---------------------------------------------------------------------------
const DUPLICATE_PHRASE = 'AAFCO nutritional adequacy statement';
let duplicateCount = 0;
for (const file of blogFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(DUPLICATE_PHRASE)) duplicateCount++;
}

// ---------------------------------------------------------------------------
// 7. pet-insurance / categories/insurance duplication check
// ---------------------------------------------------------------------------
const redirectsFile = path.join(ROOT, 'public/_redirects');
const redirectsContent = fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, 'utf8') : '';
const hasInsuranceRedirect = redirectsContent.includes('/categories/insurance') && redirectsContent.includes('/pet-insurance');

// ---------------------------------------------------------------------------
// Build report
// ---------------------------------------------------------------------------
const issues = [];
const checks = [];

// Check: crossbreed dog-names gap
if (pageInventory.dogNamesGap > 0) {
  const fixed = fs.existsSync(path.join(PAGES_DIR, 'dog-names/[breed].astro')) &&
    fs.readFileSync(path.join(PAGES_DIR, 'dog-names/[breed].astro'), 'utf8').includes('masterCrossbreeds');
  checks.push({
    id: 'crossbreed-dog-names-gap',
    name: 'Crossbreed dog-names routes',
    severity: fixed ? 'OK' : 'CRITICAL',
    detail: fixed
      ? `Fixed: masterCrossbreeds included in getStaticPaths. ${masterCrossbreeds.length} crossbreed routes now generated.`
      : `${masterCrossbreeds.length} crossbreeds missing /dog-names/ routes. Fix: add masterCrossbreeds to getStaticPaths in src/pages/dog-names/[breed].astro`,
  });
}

// Check: thin content
const totalThin = thinContent.length;
const thinFamilySummary = Object.entries(wordCountByFamily)
  .map(([family, s]) => `${family}: ${s.thin}/${s.count} thin (avg ${Math.round(s.totalWords / (s.count || 1))} words)`)
  .join(', ');
checks.push({
  id: 'thin-content',
  name: `Thin generated content (< ${WORD_THRESHOLD} words)`,
  severity: totalThin > 200 ? 'CRITICAL' : totalThin > 50 ? 'HIGH' : totalThin > 0 ? 'MEDIUM' : 'OK',
  detail: totalThin > 0
    ? `${totalThin} generated posts below ${WORD_THRESHOLD} words. By family: ${thinFamilySummary}`
    : `All scanned generated posts meet the ${WORD_THRESHOLD}-word threshold.`,
  examples: thinContent.slice(0, 5).map((t) => `${t.slug} (${t.wordCount} words)`),
});

// Check: duplicate affiliate block
checks.push({
  id: 'duplicate-affiliate-block',
  name: 'Identical AAFCO affiliate block',
  severity: duplicateCount > 100 ? 'CRITICAL' : duplicateCount > 0 ? 'HIGH' : 'OK',
  detail: duplicateCount > 0
    ? `"${DUPLICATE_PHRASE}" appears in ${duplicateCount} posts — identical paragraph across all food posts. Fix: use breedFoodGuidance() in generator.`
    : 'No identical AAFCO block detected.',
});

// Check: categories index
const hasCategoriesIndex = fs.existsSync(path.join(PAGES_DIR, 'categories/index.astro'));
checks.push({
  id: 'categories-index',
  name: '/categories/ index page',
  severity: hasCategoriesIndex ? 'OK' : 'HIGH',
  detail: hasCategoriesIndex ? 'src/pages/categories/index.astro exists.' : 'Missing /categories/ index page — creates broken mid-level URL.',
});

// Check: pet-insurance dedup
checks.push({
  id: 'pet-insurance-dedup',
  name: '/categories/insurance redirect to /pet-insurance',
  severity: hasInsuranceRedirect ? 'OK' : 'HIGH',
  detail: hasInsuranceRedirect
    ? '301 redirect in place: /categories/insurance → /pet-insurance'
    : 'Duplicate content: /categories/insurance and /pet-insurance serve overlapping content. Add 301 redirect.',
});

// Check: supplement slot display
const clusterLinksFile = path.join(ROOT, 'src/components/breed/ClusterLinks.astro');
const clusterLinksContent = fs.existsSync(clusterLinksFile) ? fs.readFileSync(clusterLinksFile, 'utf8') : '';
const hasSuppressLogic = clusterLinksContent.includes('hideWhenMissing');
checks.push({
  id: 'supplement-slot-display',
  name: 'Supplement/health cluster slot visibility guard',
  severity: hasSuppressLogic ? 'OK' : 'HIGH',
  detail: hasSuppressLogic
    ? 'hideWhenMissing flag in place — supplement/health slots suppressed when content unavailable.'
    : `supplement_post: ${clusterStats['supplement_post']?.pct}% coverage, health_post: ${clusterStats['health_post']?.pct}% coverage. Add hideWhenMissing guard to ClusterLinks.astro.`,
});

// Check: cluster coverage
for (const [key, stat] of Object.entries(clusterStats)) {
  if (stat.pct < 10) {
    checks.push({
      id: `cluster-${key}`,
      name: `Cluster coverage: ${key}`,
      severity: stat.pct === 0 ? 'HIGH' : 'MEDIUM',
      detail: `${stat.pct}% of breeds have ${key} (${stat.covered}/${stat.total}). Consider suppressing UI slot until ≥20% coverage.`,
    });
  }
}

// Check: breadcrumb schema coverage
const pagesWithoutBreadcrumb = schemaCoverage.noBreadcrumb.filter((f) => !f.includes('[') && !f.startsWith('api/') && !f.endsWith('.xml.ts') && !f.endsWith('.json.ts'));
if (pagesWithoutBreadcrumb.length > 0) {
  checks.push({
    id: 'breadcrumb-coverage',
    name: 'Breadcrumb schema coverage',
    severity: 'MEDIUM',
    detail: `${pagesWithoutBreadcrumb.length} static pages missing breadcrumb implementation: ${pagesWithoutBreadcrumb.slice(0, 5).join(', ')}`,
  });
}

// Check: homepage FAQ schema
const indexFile = path.join(PAGES_DIR, 'index.astro');
const indexContent = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
const hasHomepageFaq = indexContent.includes('FAQPage');
checks.push({
  id: 'homepage-faq-schema',
  name: 'Homepage FAQPage schema',
  severity: hasHomepageFaq ? 'OK' : 'MEDIUM',
  detail: hasHomepageFaq ? 'FAQPage schema present on homepage.' : 'Homepage missing FAQPage schema — missed rich result opportunity.',
});

// Check: HowTo schema in guide template
const blogSlugFile = path.join(PAGES_DIR, 'guides/[slug].astro');
const blogSlugContent = fs.existsSync(blogSlugFile) ? fs.readFileSync(blogSlugFile, 'utf8') : '';
const hasHowToInBlog = blogSlugContent.includes('HowTo');
checks.push({
  id: 'howto-schema-guides',
  name: 'HowTo schema on training posts',
  severity: hasHowToInBlog ? 'OK' : 'MEDIUM',
  detail: hasHowToInBlog ? 'HowTo schema generated for training posts in guides/[slug].astro.' : 'Training posts missing HowTo schema. Add to guides/[slug].astro.',
});

// Check: internal link density
checks.push({
  id: 'internal-link-density',
  name: 'Internal link density (breed pages)',
  severity: avgLinks < 3 ? 'HIGH' : avgLinks < 5 ? 'MEDIUM' : 'OK',
  detail: `Average ${avgLinks.toFixed(1)} cluster links per breed page (sample of ${sampleBreeds.length}). ${lowLinkBreeds.length > 0 ? `Low-link breeds: ${lowLinkBreeds.slice(0, 5).join(', ')}` : 'All sampled breeds have adequate link count.'}`,
});

// Check: orphan page risk
checks.push({
  id: 'orphan-page-risk',
  name: 'Orphan breed pages (no core cluster content)',
  severity: orphanRisks.length > 50 ? 'HIGH' : orphanRisks.length > 10 ? 'MEDIUM' : orphanRisks.length > 0 ? 'LOW' : 'OK',
  detail: `${orphanRisks.length} breed pages with no food/bed/training post. Examples: ${orphanRisks.slice(0, 5).join(', ')}`,
});

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const criticalCount = checks.filter((c) => c.severity === 'CRITICAL').length;
const highCount = checks.filter((c) => c.severity === 'HIGH').length;
const mediumCount = checks.filter((c) => c.severity === 'MEDIUM').length;
const okCount = checks.filter((c) => c.severity === 'OK').length;

if (JSON_MODE) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { critical: criticalCount, high: highCount, medium: mediumCount, ok: okCount },
    pageInventory,
    clusterStats,
    wordCountByFamily,
    thinContentSample: thinContent.slice(0, 20),
    checks,
  }, null, 2));
} else {
  const line = '─'.repeat(72);
  console.log(`\n${'='.repeat(72)}`);
  console.log(`  PupWiki SEO Quality Audit — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log(`${'='.repeat(72)}\n`);

  console.log(`📊 Page Inventory`);
  console.log(line);
  console.log(`  Breed hubs (purebred + crossbreed):  ${pageInventory.breeds}`);
  console.log(`  Dog-names routes (expected):          ${pageInventory.dogNames_total_expected}`);
  console.log(`  Dog-names crossbreed gap:             ${pageInventory.dogNamesGap} ${pageInventory.dogNamesGap > 0 ? '⚠️' : '✅'}`);
  console.log(`  Cost calculators:                     ${pageInventory.costCalculators}`);
  console.log(`  Guide posts (total):                   ${pageInventory.blogPosts}`);
  console.log(`  Guide posts scanned for thin content:  ${scanned}`);
  console.log();

  console.log(`📦 Content Cluster Coverage`);
  console.log(line);
  for (const [key, stat] of Object.entries(clusterStats)) {
    const bar = '█'.repeat(Math.round(stat.pct / 5)) + '░'.repeat(20 - Math.round(stat.pct / 5));
    const flag = stat.pct === 0 ? '🔴' : stat.pct < 20 ? '🟠' : stat.pct < 80 ? '🟡' : '🟢';
    console.log(`  ${flag} ${key.padEnd(22)} ${bar} ${stat.pct}% (${stat.covered}/${stat.total})`);
  }
  console.log();

  console.log(`📝 Word Count by Blog Family (generated posts only, threshold: ${WORD_THRESHOLD})`);
  console.log(line);
  for (const [family, s] of Object.entries(wordCountByFamily)) {
    const avg = Math.round(s.totalWords / (s.count || 1));
    const flag = avg < WORD_THRESHOLD ? '🔴' : avg < 600 ? '🟡' : '🟢';
    console.log(`  ${flag} ${family.padEnd(15)} avg ${String(avg).padStart(4)} words  thin: ${s.thin}/${s.count}`);
  }
  console.log();

  console.log(`🔍 Checks`);
  console.log(line);
  for (const check of checks) {
    console.log(`  ${severity(check.severity).padEnd(18)} ${check.name}`);
    console.log(`                     ${check.detail}`);
    if (check.examples?.length) {
      console.log(`                     Examples: ${check.examples.join(', ')}`);
    }
    console.log();
  }

  console.log(`${'='.repeat(72)}`);
  console.log(`  Summary: 🔴 ${criticalCount} critical  🟠 ${highCount} high  🟡 ${mediumCount} medium  ✅ ${okCount} ok`);
  console.log(`${'='.repeat(72)}\n`);
}

// Exit code
process.exit(criticalCount > 0 ? 2 : highCount > 0 ? 1 : 0);
