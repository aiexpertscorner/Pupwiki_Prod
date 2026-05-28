import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const GUIDES_DIR = new URL('../../src/content/guides/', import.meta.url).pathname;

const UNSAFE_PATTERNS = [
  /vet[- ]guided/i, /vet[- ]tested/i, /vet[- ]approved/i,
  /we tested/i, /expert picks/i, /expert tips/i,
  /clinical evidence/i, /prevents disease/i, /cures/i,
  /clinically proven/i, /reduce risk/i,
];

const GENERATED_SIGNALS = [
  /^best[- ](dog[- ])?food[- ]for/i, /^best[- ](dog[- ])?toys[- ]for/i,
  /^best[- ](dog[- ])?beds[- ]for/i, /^best[- ].+[- ]for[- ].+/i,
  /[- ]health[- ]problems$/i, /[- ]grooming[- ]guide$/i,
  /[- ]training[- ]guide$/i, /[- ]food[- ]guide$/i,
];

const HIGH_RISK_CATEGORIES = ['Health', 'Supplements', 'Supplement', 'Dog Food', 'Food'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '');
    fm[key] = val;
  }
  return fm;
}

function isLikelyGenerated(fm, slug) {
  if (fm.generated === 'true') return true;
  if (fm.contentTier === 'generated-support') return true;
  if (fm.breedSlug && (fm.postType === 'product-roundup' || HIGH_RISK_CATEGORIES.includes(fm.category))) return true;
  return GENERATED_SIGNALS.some(p => p.test(slug) || p.test(fm.title || ''));
}

const files = readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md'));

const stats = {
  total: 0, generated: 0, editorial: 0,
  missingMedicalDisclaimer: 0, missingAffiliateDisclosure: 0,
  unsafeClaimCount: 0, byPostType: {}, byContentTier: {},
};

for (const file of files) {
  const content = readFileSync(join(GUIDES_DIR, file), 'utf8');
  const fm = parseFrontmatter(content);
  const slug = file.replace(/\.md$/, '');

  stats.total++;

  const pt = fm.postType || 'general';
  stats.byPostType[pt] = (stats.byPostType[pt] || 0) + 1;

  const tier = fm.contentTier || 'unset';
  stats.byContentTier[tier] = (stats.byContentTier[tier] || 0) + 1;

  const gen = isLikelyGenerated(fm, slug);
  if (gen) stats.generated++; else stats.editorial++;

  const isHighRisk = HIGH_RISK_CATEGORIES.includes(fm.category);
  if (isHighRisk && fm.medicalDisclaimer !== 'true') stats.missingMedicalDisclaimer++;
  if (fm.postType === 'product-roundup' && fm.affiliateDisclosure === 'false') stats.missingAffiliateDisclosure++;

  for (const p of UNSAFE_PATTERNS) {
    if (p.test(content)) { stats.unsafeClaimCount++; break; }
  }
}

console.log('\n📊 PupWiki Blog Content Audit\n');
console.log(`Total posts:        ${stats.total}`);
console.log(`Likely generated:   ${stats.generated} (${Math.round(stats.generated/stats.total*100)}%)`);
console.log(`Likely editorial:   ${stats.editorial} (${Math.round(stats.editorial/stats.total*100)}%)`);
console.log(`\nMissing medical disclaimer (health/supplement posts): ${stats.missingMedicalDisclaimer}`);
console.log(`Missing affiliate disclosure (product-roundup posts):  ${stats.missingAffiliateDisclosure}`);
console.log(`Posts with unsafe claim patterns: ${stats.unsafeClaimCount}`);
console.log('\nBy postType:');
for (const [k, v] of Object.entries(stats.byPostType).sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(20)} ${v}`);
console.log('\nBy contentTier:');
for (const [k, v] of Object.entries(stats.byContentTier).sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(20)} ${v}`);
console.log('\n✅ Audit complete. Read-only — no files modified.\n');
