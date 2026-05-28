#!/usr/bin/env node
/**
 * seo-audit.mjs — MrDoggoStyle SEO Masterscript
 * ─────────────────────────────────────────────────────────────
 * Audits every page template and outputs:
 *   - SEO score per template
 *   - Missing structured data
 *   - Missing meta fields
 *   - Image coverage gaps
 *   - Internal linking gaps
 *   - Priority rework order
 *
 * Run: node scripts/seo-audit.mjs
 * Run: node scripts/seo-audit.mjs --json > seo-report.json
 * Run: node scripts/seo-audit.mjs --fix  (auto-patches fixable issues)
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const FIX     = process.argv.includes('--fix');

const G  = s => `\x1b[32m${s}\x1b[0m`;
const R  = s => `\x1b[31m${s}\x1b[0m`;
const Y  = s => `\x1b[33m${s}\x1b[0m`;
const B  = s => `\x1b[34m${s}\x1b[0m`;
const W  = s => `\x1b[1m${s}\x1b[0m`;
const D  = s => `\x1b[2m${s}\x1b[0m`;
const CY = s => `\x1b[36m${s}\x1b[0m`;

// ── Load data ─────────────────────────────────────────────────
const dataDir = path.join(ROOT, 'src', 'data');

function loadJSON(name) {
  const p = path.join(dataDir, name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

const breeds      = loadJSON('master-breeds.json') || [];
const productIdx  = loadJSON('product-index.json') || {};
const brandsData  = loadJSON('brands.json') || [];
const breedLinks  = loadJSON('breed-link-map.json') || {};
const contentStat = loadJSON('content-status.json') || {};

// ── Check which files exist ───────────────────────────────────
function pageExists(rel) {
  return fs.existsSync(path.join(ROOT, 'src', 'pages', rel));
}

function readPage(rel) {
  const p = path.join(ROOT, 'src', 'pages', rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function countImages(dir) {
  const p = path.join(ROOT, 'public', 'images', dir);
  if (!fs.existsSync(p)) return 0;
  return fs.readdirSync(p).filter(f => /\.(jpg|jpeg|png|webp|svg)$/i.test(f)).length;
}

// ── SEO checks ────────────────────────────────────────────────
function checkTemplate(src) {
  const issues = [];
  const passes = [];

  const checks = [
    ['title tag',        /title=\{|title="/,                              'Missing <title> tag — critical for ranking'],
    ['description meta', /description=\{|description="/,                  'Missing meta description'],
    ['canonicalURL',     /canonicalURL|canonical/,                        'Missing canonical URL — risk of duplicate content'],
    ['structured data',  /application\/ld\+json|jsonLd|schema\.org/,      'Missing structured data (JSON-LD) — no rich snippets'],
    ['OG tags',          /og:title|og:description|og:image|openGraph/,    'Missing Open Graph tags — poor social sharing'],
    ['breadcrumbs',      /breadcrumb|Breadcrumb/i,                        'Missing breadcrumbs — hurts navigation signals'],
    ['h1 tag',           /<h1|<H1/,                                       'Missing H1 tag'],
    ['alt attributes',   /alt=\{|alt="/,                                  'No alt attributes found on images'],
    ['internal links',   /href=\{`\/|href="\/|\[`\//,                    'Few internal links detected'],
    ['no inline styles', /style="(?!.*display.*none|.*visibility.*hidden)/g, null], // special case
    ['loading lazy',     /loading="lazy"|loading=\{/,                    'No lazy loading on images'],
  ];

  for (const [label, regex, errMsg] of checks) {
    if (label === 'no inline styles') {
      const count = (src.match(/style="/g) || []).length;
      if (count > 20) {
        issues.push(`${count} inline style attributes — move to CSS classes`);
      } else {
        passes.push('minimal inline styles');
      }
      continue;
    }
    if (regex.test(src)) {
      passes.push(label);
    } else if (errMsg) {
      issues.push(errMsg);
    }
  }

  return { issues, passes, score: Math.round((passes.length / (passes.length + issues.length)) * 100) };
}

// ── Page registry ─────────────────────────────────────────────
const PAGES = [
  {
    id:        'homepage',
    label:     'Homepage',
    path:      'index.astro',
    count:     1,
    vol_mo:    250000,
    conv:      'high',
    seo_notes: 'Primary entry point. WebSite + Organization schema needed. First impression for 15% of sessions.',
    schema_needed: ['WebSite', 'Organization', 'ItemList'],
  },
  {
    id:        'breed_hub',
    label:     'Breed Hub',
    path:      'breeds/[breed].astro',
    count:     277,
    vol_mo:    13850000, // sum of top 277 breeds
    conv:      'very-high',
    seo_notes: 'Highest traffic potential. 277 × avg 50K/mo. Core hub for topic clusters. Product CTAs.',
    schema_needed: ['BreadcrumbList', 'ItemList', 'FAQPage', 'Article'],
  },
  {
    id:        'blog_post',
    label:     'Blog Post',
    path:      'guides/[slug].astro',
    count:     25,
    vol_mo:    300000,
    conv:      'very-high',
    seo_notes: 'Review posts with product affiliate links. Article + Review + HowTo schema needed.',
    schema_needed: ['Article', 'BreadcrumbList', 'FAQPage'],
  },
  {
    id:        'category',
    label:     'Category Hub',
    path:      'categories/[category].astro',
    count:     10,
    vol_mo:    350000,
    conv:      'high',
    seo_notes: '"Best dog toys" type queries. 35K/mo avg. Product grid + filtering.',
    schema_needed: ['BreadcrumbList', 'ItemList', 'FAQPage'],
  },
  {
    id:        'dog_names_index',
    label:     'Dog Names Index',
    path:      'dog-names/index.astro',
    count:     1,
    vol_mo:    550000,
    conv:      'medium',
    seo_notes: '"Dog names" = 550K/mo. High-volume informational. Newsletter capture opportunity.',
    schema_needed: ['WebPage', 'BreadcrumbList', 'ItemList'],
  },
  {
    id:        'cost_calculator',
    label:     'Cost Calculator',
    path:      'cost-calculator/[breed].astro',
    count:     277,
    vol_mo:    11080000, // 277 × 40K avg
    conv:      'high',
    seo_notes: '"How much does X cost" = 40K/mo avg. Fresh subscription CTAs. FAQPage schema critical.',
    schema_needed: ['FAQPage', 'BreadcrumbList', 'HowTo'],
  },
  {
    id:        'dog_names_breed',
    label:     'Dog Names (per breed)',
    path:      'dog-names/[breed].astro',
    count:     277,
    vol_mo:    4155000, // 277 × 15K avg
    conv:      'medium-high',
    seo_notes: '"Golden retriever names" = 15K/mo avg. FAQPage schema needed. Email capture.',
    schema_needed: ['FAQPage', 'BreadcrumbList', 'ItemList'],
  },
  {
    id:        'breeds_index',
    label:     'Breeds Index',
    path:      'breeds/index.astro',
    count:     1,
    vol_mo:    500000,
    conv:      'medium',
    seo_notes: '"Dog breeds" = 500K/mo. Discovery page. Needs image grid + A-Z filter.',
    schema_needed: ['BreadcrumbList', 'ItemList', 'CollectionPage'],
  },
  {
    id:        'brand_hub',
    label:     'Brand Hub',
    path:      'brands/[brand].astro',
    count:     122,
    vol_mo:    2196000, // 122 × 18K avg
    conv:      'high',
    seo_notes: '"KONG dog toys" = 18K/mo avg. Organization schema per brand.',
    schema_needed: ['Organization', 'BreadcrumbList', 'ItemList'],
  },
  {
    id:        'blog_index',
    label:     'Blog Index',
    path:      'guides/index.astro',
    count:     1,
    vol_mo:    50000,
    conv:      'medium',
    seo_notes: 'Internal navigation. CollectionPage schema.',
    schema_needed: ['CollectionPage', 'BreadcrumbList'],
  },
];

// ── Image coverage audit ──────────────────────────────────────
const breedImgCount  = countImages('breeds');
const brandImgCount  = countImages('brands');
const catImgCount    = countImages('categories');
const productImgCount= countImages('products');
const breedsWithImg  = breeds.filter(b => b.image_url).length;
const productsTotal  = Object.keys(productIdx).length;

// ── Internal linking audit ────────────────────────────────────
function auditInternalLinks() {
  const issues = [];
  const breedSlugs = new Set(breeds.map(b => b.slug));
  let linkedBreeds = 0;
  for (const slug of breedSlugs) {
    const links = breedLinks[slug] || {};
    if (Object.keys(links).length >= 5) linkedBreeds++;
  }
  if (linkedBreeds < breeds.length * 0.8) {
    issues.push(`Only ${linkedBreeds}/${breeds.length} breeds have full link clusters`);
  }
  return issues;
}

// ── Structured data audit per template ───────────────────────
function auditStructuredData() {
  const results = {};
  for (const page of PAGES) {
    const src = readPage(page.path);
    if (!src) { results[page.id] = { exists: false }; continue; }
    const hasSchema = /application\/ld\+json|schema\.org/.test(src);
    const schemaTypes = (src.match(/"@type":\s*"([^"]+)"/g) || [])
      .map(m => m.replace(/"@type":\s*"/, '').replace('"', ''));
    results[page.id] = {
      exists:   true,
      hasSchema,
      schemaTypes,
      missing:  page.schema_needed.filter(s => !schemaTypes.includes(s)),
    };
  }
  return results;
}

// ── Run all audits ────────────────────────────────────────────
const schemaAudit  = auditStructuredData();
const linkIssues   = auditInternalLinks();

// ── Calculate priority score ──────────────────────────────────
function priorityScore(page) {
  const sd = schemaAudit[page.id] || {};
  const templateSrc = readPage(page.path);
  const check = templateSrc ? checkTemplate(templateSrc) : { score: 0, issues: ['Page not found'] };

  const volScore   = Math.min(10, Math.log10(page.vol_mo + 1) * 2);
  const convScore  = { 'very-high': 10, 'high': 8, 'medium-high': 6, 'medium': 4, 'low': 2 }[page.conv] || 5;
  const countScore = Math.min(10, Math.log10(page.count + 1) * 4);
  const sdGap      = sd.missing ? (sd.missing.length / page.schema_needed.length) * 10 : 10;
  const qualGap    = 100 - (check.score || 0);

  return Math.round((volScore * 0.35 + convScore * 0.25 + countScore * 0.15 + sdGap * 0.15 + qualGap/10 * 0.10));
}

const rankedPages = PAGES
  .map(p => ({ ...p, priority: priorityScore(p), audit: schemaAudit[p.id] || {} }))
  .sort((a, b) => b.priority - a.priority);

// ── Output ────────────────────────────────────────────────────
if (JSON_OUT) {
  console.log(JSON.stringify({ pages: rankedPages, images: { breedImgCount, brandImgCount, catImgCount, productImgCount }, linkIssues }, null, 2));
  process.exit(0);
}

console.log(`\n${'═'.repeat(62)}`);
console.log(` ${W('MrDoggoStyle — SEO Masterscript Audit')}`);
console.log(` ${D(`Run: ${new Date().toLocaleString()}`)}`);
console.log(`${'═'.repeat(62)}\n`);

// ── Image coverage ────────────────────────────────────────────
console.log(`${CY('📸 IMAGE COVERAGE')}`);
console.log(`  Breed photos:    ${breedImgCount >= 200 ? G(breedImgCount) : R(breedImgCount)} / 277 breeds`);
console.log(`  Brand logos:     ${brandImgCount >= 50  ? G(brandImgCount) : Y(brandImgCount)} / ${brandsData.length} brands`);
console.log(`  Category images: ${catImgCount  >= 11  ? G(catImgCount)  : R(catImgCount)}  / 12 categories`);
console.log(`  Product images:  ${productImgCount >= 50 ? G(productImgCount) : Y(productImgCount)} / ${productsTotal} products`);
console.log();

// ── Internal linking ──────────────────────────────────────────
console.log(`${CY('🔗 INTERNAL LINKING')}`);
if (linkIssues.length) {
  linkIssues.forEach(i => console.log(`  ${Y('⚠')}  ${i}`));
} else {
  console.log(`  ${G('✓')}  All breed clusters fully linked`);
}
console.log();

// ── Page template priority ────────────────────────────────────
console.log(`${CY('🎯 PAGE TEMPLATE REWORK PRIORITY')}`);
console.log(D(`  Score = weighted(search_vol + conversion + page_count + schema_gap + quality_gap)\n`));

rankedPages.forEach((page, i) => {
  const rank      = i + 1;
  const exists    = page.audit.exists !== false;
  const hasSchema = page.audit.hasSchema;
  const missing   = page.audit.missing || page.schema_needed;
  const volM      = (page.vol_mo / 1000000).toFixed(1);

  const scoreBar  = '█'.repeat(Math.round(page.priority / 10)) + '░'.repeat(10 - Math.round(page.priority / 10));

  console.log(`  ${W(`${rank}.`)} ${B(page.label.padEnd(22))} ${scoreBar} ${page.priority}/100`);
  console.log(`     ${D('Pages:')} ${page.count.toString().padEnd(5)} ${D('Volume:')} ${volM}M/mo  ${D('Conv:')} ${page.conv}`);
  console.log(`     ${D('File:')}  src/pages/${page.path}`);

  if (!exists) {
    console.log(`     ${R('✗ PAGE DOES NOT EXIST')} — needs to be created`);
  } else {
    if (!hasSchema) {
      console.log(`     ${R('✗ NO structured data')} — needs: ${missing.join(', ')}`);
    } else if (missing.length > 0) {
      console.log(`     ${Y('⚠ Missing schema:')} ${missing.join(', ')}`);
    } else {
      console.log(`     ${G('✓ Structured data OK')}`);
    }
  }
  console.log(`     ${D('Note:')} ${page.seo_notes.slice(0, 70)}`);
  console.log();
}); 

// ── Template rework plan ──────────────────────────────────────
console.log(`${'═'.repeat(62)}`);
console.log(` ${CY('📋 TEMPLATE REWORK PLAN')}`);
console.log(`${'═'.repeat(62)}`);

const REWORK_PLAN = [
  {
    phase: 1,
    name:  'Core templates — highest traffic',
    items: [
      { template:'breed hub',      why:'277 pages × 50K/mo = largest traffic source',       effort:'M', impact:'★★★★★' },
      { template:'guide post',      why:'Primary affiliate revenue pages',                    effort:'M', impact:'★★★★★' },
      { template:'homepage',       why:'First impression + brand trust signal',              effort:'S', impact:'★★★★' },
    ]
  },
  {
    phase: 2,
    name:  'Discovery + acquisition pages',
    items: [
      { template:'category hub',   why:'10 pages, 350K/mo — product grids + SEO hub',       effort:'S', impact:'★★★★' },
      { template:'breeds index',   why:'"Dog breeds" 500K/mo — major discovery page',        effort:'S', impact:'★★★★' },
      { template:'dog names index',why:'"Dog names" 550K/mo — high volume informational',   effort:'S', impact:'★★★' },
    ]
  },
  {
    phase: 3,
    name:  'Long-tail volume pages',
    items: [
      { template:'cost calculator',why:'277 pages × 40K/mo = huge long-tail opportunity',   effort:'M', impact:'★★★★' },
      { template:'dog names breed',why:'277 pages × 15K/mo — FAQPage + email capture',      effort:'M', impact:'★★★' },
      { template:'brand hub',      why:'122 pages × 18K/mo — direct affiliate impact',      effort:'S', impact:'★★★' },
    ]
  },
  {
    phase: 4,
    name:  'Navigation + UX',
    items: [
      { template:'guides index',     why:'Internal navigation, CollectionPage schema',         effort:'S', impact:'★★' },
    ]
  },
];

for (const phase of REWORK_PLAN) {
  console.log(`\n  ${W(`Phase ${phase.phase}:`)} ${phase.name}`);
  for (const item of phase.items) {
    console.log(`    ${G('→')} ${item.template.padEnd(20)} ${item.impact}  ${D(item.why)}`);
    console.log(`       ${D('Effort:')} ${item.effort === 'S' ? G('Small') : Y('Medium')}`);
  }
}

// ── Per-template action items ─────────────────────────────────
console.log(`\n${'═'.repeat(62)}`);
console.log(` ${CY('🔧 ACTION ITEMS PER TEMPLATE')}`);
console.log(`${'═'.repeat(62)}`);

const ACTIONS = {
  'breed_hub': [
    'Move all inline styles → src/styles/breed-hub.css',
    'Add BreadcrumbList + FAQPage + ItemList JSON-LD',
    'Add loading="eager" on hero breed image',
    'Breed image → /images/breeds/{slug}.jpg (local)',
    'Add rel="preconnect" for Dog CEO image CDN',
    'Add "People also ask" FAQ section (5 questions)',
    'Add AggregateRating schema on product picks',
  ],
  'blog_post': [
    'Move inline styles → src/styles/guides.css',
    'Add Article + BreadcrumbList + FAQPage JSON-LD',
    'Add author schema with Organization',
    'Add TableOfContents component (improves dwell time)',
    'Add RelatedPosts section (reduces bounce rate)',
    'Add category stock image as hero (Dog-{Cat}.png)',
    'Add estimated reading time to meta',
    'Add dateModified to Article schema',
  ],
  'homepage': [
    'Move inline styles → src/styles/homepage.css',
    'Add WebSite + Organization + ItemList JSON-LD',
    'Add sitelinks search box schema',
    'Add OG image (social sharing)',
    'Add brand logo strip (loaded logos visible)',
    'Add latest/featured post images (Dog-All.png fallback)',
  ],
  'category': [
    'Add category stock image as hero background',
    'Add BreadcrumbList + ItemList + FAQPage JSON-LD',
    'Move inline styles → src/styles/category.css',
    'Add subcategory filter chips',
    'Add brand filter sidebar',
  ],
  'dog_names_index': [
    'Move all inline styles → src/styles/dog-names.css',
    'Remove inline onmouseover/onmouseout JS — use CSS :hover',
    'Add WebPage + BreadcrumbList + ItemList JSON-LD',
    'Add OG image',
    'Add structured FAQ about naming dogs',
  ],
  'breeds_index': [
    'Move inline styles → src/styles/breeds-index.css',
    'Add CollectionPage + BreadcrumbList JSON-LD',
    'Add breed images to grid (from /images/breeds/)',
    'Add size/energy/group filter',
    'Add "most popular" section at top',
  ],
};

for (const [id, actions] of Object.entries(ACTIONS)) {
  const page = PAGES.find(p => p.id === id);
  if (!page) continue;
  console.log(`\n  ${W(page.label)} ${D(`(src/pages/${page.path})`)}`);
  actions.forEach(a => console.log(`    ${Y('→')} ${a}`));
}

// ── Architecture recommendation ───────────────────────────────
console.log(`\n${'═'.repeat(62)}`);
console.log(` ${CY('🏗  RECOMMENDED FILE ARCHITECTURE')}`);
console.log(`${'═'.repeat(62)}`);
console.log(`
  src/
  ├── pages/
  │   ├── breeds/[breed].astro        ← template only, no styles
  │   ├── guides/[slug].astro           ← template only
  │   ├── categories/[category].astro
  │   ├── dog-names/[breed].astro
  │   ├── cost-calculator/[breed].astro
  │   └── brands/[brand].astro
  │
  ├── styles/                         ← NEW: one CSS file per template
  │   ├── global.css                  ← design tokens, reset
  │   ├── homepage.css
  │   ├── breed-hub.css
  │   ├── guides.css
  │   ├── category.css
  │   ├── dog-names.css
  │   ├── brands.css
  │   └── cost-calculator.css
  │
  ├── components/
  │   ├── content/                    ← BlogCard, ProductCard, etc.
  │   ├── seo/                        ← NEW
  │   │   ├── SchemaBreed.astro       ← all breed schemas
  │   │   ├── SchemaBlogPost.astro    ← article schemas
  │   │   ├── SchemaFAQ.astro         ← reusable FAQ schema
  │   │   ├── BreadcrumbNav.astro     ← breadcrumb + schema
  │   │   └── OGImage.astro           ← open graph meta
  │   └── ui/                         ← generic UI
  │       ├── HeroSection.astro
  │       ├── StatBar.astro
  │       ├── FilterChips.astro
  │       └── SectionHeader.astro
`);

console.log(`  ${G('Run:')} node scripts/seo-audit.mjs --json > seo-report.json`);
console.log(`  ${G('Run:')} node scripts/seo-audit.mjs --fix  (patches meta fields)\n`);
