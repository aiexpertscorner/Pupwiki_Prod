import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const GUIDES_DIR = resolve(ROOT, 'src/content/guides');
const ARCHIVE_DIR = resolve(ROOT, 'src/content/guides-archive');
const BREED_IMG_DIR = resolve(ROOT, 'public/images/breeds');
const AMAZON_CSV = resolve(ROOT, 'src/data/AMAZON_PRODUCT_SEED_SITESTRIPE - amazon-products-live-checked.csv');
const AWIN_JSON = resolve(ROOT, 'src/data/awin-products.json');

const DRY_RUN = !process.argv.includes('--apply');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 80);

const variants = {
  titles: [
    (b, c) => `Best ${c} for ${b} (2026 buyer's guide)`,
    (b, c) => `${b} owners: ${c} that are actually worth buying`,
    (b, c) => `${c} for ${b}: what to buy first`,
    (b, c) => `${b} ${c} comparison: top picks this year`,
  ],
  intros: [
    (b) => `${b} owners often overbuy. This guide focuses on products that solve a real daily problem.`,
    (b) => `If you own a ${b}, your shortlist should match coat, energy, and routine instead of hype.`,
    (b) => `This page narrows the noise for ${b} households with practical picks and clear trade-offs.`,
  ]
};

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, i) => row[h] = (cols[i] || '').trim());
    return row;
  });
}

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const titleCase = (s) => String(s || '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const breedImages = existsSync(BREED_IMG_DIR) ? readdirSync(BREED_IMG_DIR).filter((f) => f.endsWith('.jpg')) : [];
const breedSlugs = breedImages.map((f) => f.replace(/\.jpg$/, ''));
const pickBreed = (seed) => breedSlugs[Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % Math.max(1, breedSlugs.length)] || 'labrador-retriever';

const amazonRows = existsSync(AMAZON_CSV) ? parseCsv(readFileSync(AMAZON_CSV, 'utf8')) : [];
const awinRows = existsSync(AWIN_JSON) ? JSON.parse(readFileSync(AWIN_JSON, 'utf8')) : [];

const merged = [
  ...amazonRows.map((r) => ({ source: 'amazon', name: r.name || r.title || r.product_name || 'Product', category: r.categoryGroup || r.categoryLabel || 'Dog gear', brand: r.brand || 'Amazon', href: r.amazonAffiliateUrl || '' })),
  ...awinRows.map((r) => ({ source: 'awin', name: r.name, category: r.category || 'Dog gear', brand: r.merchant || 'AWIN partner', href: r.url || '' })),
].filter((r) => r.href);

const selected = merged.slice(0, LIMIT);

const generated = selected.map((item, i) => {
  const breedSlug = pickBreed(`${item.name}-${i}`);
  const breedName = titleCase(breedSlug);
  const cat = item.category || 'Dog gear';
  const title = variants.titles[i % variants.titles.length](breedName, cat);
  const intro = variants.intros[i % variants.intros.length](breedName);
  const slug = slugify(`${breedSlug}-${cat}-${item.source}-${i + 1}`);

  const fm = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndescription: "Actionable ${cat.toLowerCase()} guide for ${breedName} owners using live affiliate inventory."\npubDate: ${new Date().toISOString()}\nupdatedDate: ${new Date().toISOString()}\nimage: /images/breeds/${breedSlug}.jpg\ncategory: "${cat.replace(/"/g, '')}"\ntags: ["${breedName}", "${cat}", "${item.source}", "money page"]\nauthor: "The PupWiki Team"\n---\n`;
  const body = `\n${intro}\n\n## Why this guide exists\nWe prioritized products with live affiliate availability and practical owner fit signals.\n\n## Featured pick\n- **${item.name}** by **${item.brand}**\n- Affiliate link: ${item.href}\n\n## Fit notes for ${breedName}\n- Match purchases to coat maintenance, activity level, and home setup.\n- Start with one high-impact purchase and review monthly use before expanding.\n\n## Quick buyer checklist\n1. Confirm sizing and compatibility.\n2. Compare long-term replacement cost.\n3. Track if this solves a real routine friction point.\n`;

  return { slug, content: fm + body };
});

if (!DRY_RUN) {
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  for (const file of readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md'))) {
    renameSync(join(GUIDES_DIR, file), join(ARCHIVE_DIR, file));
  }
  for (const post of generated) {
    writeFileSync(join(GUIDES_DIR, `${post.slug}.md`), post.content, 'utf8');
  }
}

console.log(JSON.stringify({ dryRun: DRY_RUN, archivedFrom: GUIDES_DIR, archiveTo: ARCHIVE_DIR, toGenerate: generated.length, sampleSlugs: generated.slice(0, 8).map((p) => p.slug) }, null, 2));
