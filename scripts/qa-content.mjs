#!/usr/bin/env node
/**
 * scripts/qa-content.mjs
 *
 * Content quality audit for src/content/guides/.
 * Run: node scripts/qa-content.mjs [--verbose]
 *
 * Checks:
 *  1. Missing breedSlug frontmatter (breed-specific posts without association)
 *  2. Template artifacts — phrases that indicate a content template placeholder
 *     leaked into published copy ("a Average lifespan", "a active breed", etc.)
 *  3. Intro paragraph similarity — flags pairs with >80% token overlap
 *  4. Health claim mismatch — breed post mentions a condition not in that breed's data
 *
 * Output: severity-sorted report with counts. Use --verbose for full details.
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const GUIDES_DIR  = resolve('src/content/guides');
const VERBOSE   = process.argv.includes('--verbose');
const MAX_PAIRS = 50; // cap pair comparison at N posts to avoid O(n²) blowup

// ── Load breed data ───────────────────────────────────────────────
const breeds      = require('../src/data/master-breeds.json');
const breedBySlug = new Map(breeds.map(b => [b.slug, b]));

// ── Artifact patterns ─────────────────────────────────────────────
const ARTIFACT_PATTERNS = [
  { re: /\ba\s+[A-Z][a-z]+ (lifespan|breed|dog|size|weight)/g,      label: 'article before capitalised word (likely template variable)' },
  { re: /\{\{[^}]+\}\}/g,                                            label: 'unresolved template placeholder' },
  { re: /undefined/gi,                                                label: '"undefined" literal in content' },
  { re: /\bnull\b/g,                                                  label: '"null" literal in content' },
  { re: /\[object Object\]/g,                                        label: '[object Object] serialisation artifact' },
  { re: /averagelifespan|avg lifespan/gi,                            label: 'concatenated "averagelifespan" field name' },
  { re: /\ba (active|calm|regular) breed/gi,                         label: 'article + energy_level raw value' },
  { re: /\ba (easy|moderate|difficult) (to train|training)/gi,       label: 'article + training_level raw value' },
  { re: /(small|medium|large|giant)-sized sized/gi,                  label: 'doubled "sized"' },
];

// ── Health condition keywords for mismatch check ─────────────────
// Maps lowercased condition token → regex to find in text
function conditionTokens(ailmentStr) {
  if (!ailmentStr || ailmentStr === 'none') return [];
  return ailmentStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

// ── Frontmatter parser (minimal, regex-based) ─────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

// ── Token set for similarity check ───────────────────────────────
function tokenise(str) {
  return new Set(
    str.toLowerCase()
       .replace(/<[^>]+>/g, ' ')
       .replace(/[^a-z0-9\s]/g, ' ')
       .split(/\s+/)
       .filter(t => t.length > 3) // skip stop-word length tokens
  );
}

function jaccardSimilarity(setA, setB) {
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Extract first paragraph of body (after frontmatter)
function extractIntro(content) {
  const body = content.replace(/^---[\s\S]*?---/, '').trimStart();
  const lines = body.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines[0] ?? '';
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

async function run() {
  const files = (await readdir(GUIDES_DIR)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  console.log(`\nQA audit — ${files.length} posts in ${GUIDES_DIR}\n`);

  const issues = { error: [], warning: [], info: [] };
  const add = (severity, file, msg) => issues[severity].push({ file, msg });

  const posts = [];

  for (const filename of files) {
    const path    = join(GUIDES_DIR, filename);
    const content = await readFile(path, 'utf8');
    const fm      = parseFrontmatter(content);
    const body    = content.replace(/^---[\s\S]*?---/, '');

    posts.push({ filename, fm, body, intro: extractIntro(content) });

    // ── Check 1: missing breedSlug ────────────────────────────────
    // Only flag if the post title or filename contains a breed name hint
    if (!fm.breedSlug) {
      const lc = filename.toLowerCase();
      // Simple heuristic: filename contains a likely breed word
      const breedInName = breeds.some(b =>
        b.slug && lc.includes(b.slug.split('-')[0]) && b.slug.length > 4
      );
      if (breedInName) {
        add('warning', filename, 'No breedSlug frontmatter but filename suggests breed-specific post');
      }
    } else {
      // Validate the slug exists
      if (!breedBySlug.has(fm.breedSlug)) {
        add('error', filename, `breedSlug "${fm.breedSlug}" not found in master-breeds.json`);
      }
    }

    // ── Check 2: template artifacts ───────────────────────────────
    for (const { re, label } of ARTIFACT_PATTERNS) {
      re.lastIndex = 0;
      const matches = body.match(re);
      if (matches) {
        const severity = label.includes('placeholder') || label.includes('undefined') || label.includes('null') ? 'error' : 'warning';
        add(severity, filename, `Artifact (${label}): ${matches.slice(0,3).join(' | ')}`);
      }
    }

    // ── Check 3: health mismatch ──────────────────────────────────
    if (fm.breedSlug && breedBySlug.has(fm.breedSlug)) {
      const breed    = breedBySlug.get(fm.breedSlug);
      const ailments = conditionTokens(breed.ranking_data?.genetic_ailment_names);
      // Look for condition mentions that definitely don't belong
      // Strategy: if post mentions hip dysplasia and breed has none listed + is toy group, flag
      const hipMention  = /hip dysplasia/i.test(body);
      const bloatMention = /bloat|gastric dilatation|GDV/i.test(body);
      if (hipMention && breed.size_category === 'small' && ailments.length && !ailments.some(a => a.includes('hip'))) {
        add('info', filename, `Mentions hip dysplasia but breed is small with no hip condition listed`);
      }
      if (bloatMention && breed.size_category === 'small') {
        add('info', filename, `Mentions bloat/GDV — unusual for small breed; verify accuracy`);
      }
    }
  }

  // ── Check 4: intro similarity (sample up to MAX_PAIRS posts) ────
  const sample = posts.slice(0, MAX_PAIRS);
  let pairsFlagged = 0;
  for (let i = 0; i < sample.length; i++) {
    const tokA = tokenise(sample[i].intro);
    if (tokA.size < 10) continue; // skip very short intros
    for (let j = i + 1; j < sample.length; j++) {
      const tokB = tokenise(sample[j].intro);
      if (tokB.size < 10) continue;
      const sim = jaccardSimilarity(tokA, tokB);
      if (sim >= 0.80) {
        issues.error.push({
          file: `${sample[i].filename} ↔ ${sample[j].filename}`,
          msg: `Intro similarity ${(sim*100).toFixed(1)}% — likely template duplication`,
        });
        pairsFlagged++;
      } else if (sim >= 0.65) {
        issues.warning.push({
          file: `${sample[i].filename} ↔ ${sample[j].filename}`,
          msg: `Intro similarity ${(sim*100).toFixed(1)}% — review for near-duplication`,
        });
        pairsFlagged++;
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────
  const totalIssues = issues.error.length + issues.warning.length + issues.info.length;

  if (totalIssues === 0) {
    console.log('✅  No issues found.\n');
    return;
  }

  for (const [level, label, icon] of [['error','ERRORS','❌'],['warning','WARNINGS','⚠️ '],['info','INFO','ℹ️ ']]) {
    const list = issues[level];
    if (!list.length) continue;
    console.log(`${icon}  ${label} (${list.length})`);
    console.log('─'.repeat(60));
    if (VERBOSE) {
      for (const { file, msg } of list) console.log(`  ${file}\n    → ${msg}`);
    } else {
      // Deduplicate by message type
      const seen = new Map();
      for (const { file, msg } of list) {
        const key = msg.slice(0, 60);
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(file);
      }
      for (const [key, files] of seen) {
        console.log(`  ${key}`);
        const show = files.slice(0, 3);
        for (const f of show) console.log(`    • ${f}`);
        if (files.length > 3) console.log(`    … and ${files.length - 3} more`);
      }
    }
    console.log();
  }

  console.log(`Total: ${issues.error.length} errors, ${issues.warning.length} warnings, ${issues.info.length} info`);
  if (!VERBOSE && totalIssues > 10) console.log('Run with --verbose for full details\n');
}

run().catch(err => { console.error(err); process.exit(1); });
