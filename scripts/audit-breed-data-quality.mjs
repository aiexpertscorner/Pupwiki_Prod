#!/usr/bin/env node
/**
 * scripts/audit-breed-data-quality.mjs
 *
 * Audits breed data for display-safety issues.
 * Run: node scripts/audit-breed-data-quality.mjs
 * Run: node scripts/audit-breed-data-quality.mjs --strict
 *
 * Exit code 0 = audit complete (with/without issues)
 * Exit code 1 = --strict mode AND issues found
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src/data');
const STRICT = process.argv.includes('--strict');

// ─── Data loading ─────────────────────────────────────────────────────────────

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const masterBreeds = loadJson(join(DATA, 'master-breeds.json')) ?? [];
const masterCrossbreeds = loadJson(join(DATA, 'master-crossbreeds.json')) ?? [];
const allBreeds = [...masterBreeds, ...masterCrossbreeds];

// ─── Validation rules ─────────────────────────────────────────────────────────

const LIFESPAN_MIN = 5;
const LIFESPAN_MAX = 25;

const BANNED_SEO_TERMS = ['best products', 'vet-guided', 'vet guided', 'vet-approved', 'vet approved', 'expert picks', 'guaranteed'];
const BANNED_COPY_TERMS = ['perfect breed', 'best breed for', 'safest', 'guaranteed'];

function checkLifespan(breed) {
  const issues = [];
  const slug = breed.slug ?? '?';
  const longevity = Number(breed?.ranking_data?.longevity_years ?? NaN);

  if (Number.isFinite(longevity)) {
    if (longevity < LIFESPAN_MIN) {
      issues.push({ slug, field: 'ranking_data.longevity_years', level: 'ERROR', detail: `Value ${longevity} is suspiciously low (< ${LIFESPAN_MIN})` });
    } else if (longevity > LIFESPAN_MAX) {
      issues.push({ slug, field: 'ranking_data.longevity_years', level: 'ERROR', detail: `Value ${longevity} is suspiciously high (> ${LIFESPAN_MAX})` });
    }
  }

  const life = breed.life_expectancy ?? {};
  const lifeMin = Number(life.min ?? NaN);
  const lifeMax = Number(life.max ?? NaN);

  if (Number.isFinite(lifeMin) && Number.isFinite(lifeMax)) {
    if (lifeMin > lifeMax) {
      issues.push({ slug, field: 'life_expectancy', level: 'WARN', detail: `min (${lifeMin}) > max (${lifeMax})` });
    }
    if (lifeMin < LIFESPAN_MIN || lifeMax > LIFESPAN_MAX) {
      issues.push({ slug, field: 'life_expectancy', level: 'WARN', detail: `Range ${lifeMin}–${lifeMax} outside biological bounds ${LIFESPAN_MIN}–${LIFESPAN_MAX}` });
    }
  }

  return issues;
}

function checkWeight(breed) {
  const issues = [];
  const wt = breed.weight ?? {};
  const min = Number(wt.min_lbs ?? NaN);
  const max = Number(wt.max_lbs ?? NaN);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
    issues.push({ slug: breed.slug, field: 'weight', level: 'WARN', detail: `min (${min}) > max (${max})` });
  }
  return issues;
}

function checkSeoTitle(breed) {
  const title = String(breed?.seo?.title ?? '').toLowerCase();
  if (!title) return [];
  const found = BANNED_SEO_TERMS.find((t) => title.includes(t));
  if (found) {
    return [{ slug: breed.slug, field: 'seo.title', level: 'WARN', detail: `Contains banned term: "${found}"` }];
  }
  return [];
}

function checkDescription(breed) {
  if (!breed.description) {
    return [{ slug: breed.slug, field: 'description', level: 'WARN', detail: 'Missing or empty description' }];
  }
  return [];
}

function checkTraits(breed) {
  if (!breed.traits) {
    return [{ slug: breed.slug, field: 'traits', level: 'WARN', detail: 'Missing traits object' }];
  }
  return [];
}

function checkSlug(breed) {
  if (!breed.slug) {
    return [{ slug: '(missing)', field: 'slug', level: 'ERROR', detail: 'Breed has no slug' }];
  }
  return [];
}

// ─── FAQ audit ────────────────────────────────────────────────────────────────

const FAQ_DIR = join(DATA, 'faq');
const EXPECTED_TOPICS = ['cost', 'grooming', 'training', 'health', 'behavior', 'exercise', 'feeding', 'suitability'];

function auditFaqFiles() {
  const issues = [];
  if (!existsSync(FAQ_DIR)) {
    issues.push({ slug: 'all', field: 'faq/', level: 'WARN', detail: 'FAQ directory not found' });
    return issues;
  }
  const files = readdirSync(FAQ_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const slug = file.replace('.json', '');
    const data = loadJson(join(FAQ_DIR, file));
    if (!data?.topics) {
      issues.push({ slug, field: 'faq', level: 'WARN', detail: 'No topics object' });
      continue;
    }
    for (const topic of EXPECTED_TOPICS) {
      if (!data.topics[topic]) {
        issues.push({ slug, field: `faq.topics.${topic}`, level: 'WARN', detail: 'Topic missing' });
      } else if (!Array.isArray(data.topics[topic]?.faqs) || data.topics[topic].faqs.length < 2) {
        issues.push({ slug, field: `faq.topics.${topic}`, level: 'WARN', detail: 'Fewer than 2 FAQ entries' });
      }
    }
  }
  return issues;
}

// ─── Duplicate slug check ─────────────────────────────────────────────────────

function checkDuplicateSlugs(breeds) {
  const seen = new Map();
  const issues = [];
  for (const b of breeds) {
    if (!b.slug) continue;
    if (seen.has(b.slug)) {
      issues.push({ slug: b.slug, field: 'slug', level: 'ERROR', detail: `Duplicate slug (also in ${seen.get(b.slug)})` });
    } else {
      seen.set(b.slug, b._source ?? 'master-breeds');
    }
  }
  return issues;
}

// ─── Run audit ────────────────────────────────────────────────────────────────

const allIssues = [];

// Mark sources for duplicate detection
const taggedBreeds = [
  ...masterBreeds.map((b) => ({ ...b, _source: 'master-breeds' })),
  ...masterCrossbreeds.map((b) => ({ ...b, _source: 'master-crossbreeds' })),
];

allIssues.push(...checkDuplicateSlugs(taggedBreeds));

for (const breed of allBreeds) {
  allIssues.push(
    ...checkSlug(breed),
    ...checkLifespan(breed),
    ...checkWeight(breed),
    ...checkSeoTitle(breed),
    ...checkDescription(breed),
    ...checkTraits(breed),
  );
}

allIssues.push(...auditFaqFiles());

// ─── Report ───────────────────────────────────────────────────────────────────

const errors = allIssues.filter((i) => i.level === 'ERROR');
const warnings = allIssues.filter((i) => i.level === 'WARN');

const lifespanErrors = allIssues.filter((i) => i.field === 'ranking_data.longevity_years' && i.level === 'ERROR');
const seoTitleWarnings = allIssues.filter((i) => i.field === 'seo.title');

console.log(`\n🐾 PupWiki Breed Data Quality Audit\n${'─'.repeat(50)}`);
console.log(`  Total breeds audited : ${allBreeds.length}`);
console.log(`  Errors (display-risk): ${errors.length}`);
console.log(`  Warnings (review)    : ${warnings.length}`);
console.log(`  Suspicious lifespan  : ${lifespanErrors.length} breeds`);
console.log(`  SEO title violations : ${seoTitleWarnings.length} breeds`);
console.log(`${'─'.repeat(50)}\n`);

if (errors.length > 0) {
  console.log('ERRORS (must fix before display):');
  for (const issue of errors.slice(0, 30)) {
    console.log(`  [${issue.level}] ${issue.slug} → ${issue.field}: ${issue.detail}`);
  }
  if (errors.length > 30) console.log(`  ... and ${errors.length - 30} more`);
  console.log('');
}

if (STRICT && warnings.length > 0) {
  console.log('WARNINGS (--strict mode, showing first 30):');
  for (const issue of warnings.slice(0, 30)) {
    console.log(`  [${issue.level}] ${issue.slug} → ${issue.field}: ${issue.detail}`);
  }
  if (warnings.length > 30) console.log(`  ... and ${warnings.length - 30} more`);
  console.log('');
}

if (lifespanErrors.length > 0) {
  console.log('Breeds with suspicious longevity_years:');
  for (const issue of lifespanErrors) {
    console.log(`  ${issue.slug}: ${issue.detail}`);
  }
  console.log('');
}

if (!STRICT && warnings.length > 0) {
  console.log(`Run with --strict to see all ${warnings.length} warnings.\n`);
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ No issues found.\n');
}

if (STRICT && (errors.length > 0 || warnings.length > 0)) {
  process.exit(1);
}
if (!STRICT && errors.length > 0) {
  process.exit(1);
}
