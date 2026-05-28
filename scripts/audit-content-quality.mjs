#!/usr/bin/env node
/**
 * Content Quality Gatekeeper
 *
 * Scans generated guide posts and flags pages below enrichment thresholds.
 * Run via: node scripts/audit-content-quality.mjs
 * In CI with BLOCK_THIN_CONTENT=1, exits non-zero to block the build.
 *
 * Thresholds are intentionally strict — the goal is to catch 69-line
 * boilerplate pages before they reach production.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES_DIR = join(ROOT, 'src/content/guides');

// ── Thresholds ────────────────────────────────────────────────────
const THRESHOLDS = {
  minBodyWords:     600,  // min unique words in body (after stripping links/headings)
  minDataTokens:      3,  // min breed-specific numbers: weight ranges, percentages, timeframes
  minH2Count:         2,  // min ## headings
  minFaqCount:        2,  // min FAQ pairs (Q: or **How...)
  boilerplateMax:     2,  // max boilerplate fingerprint matches before flagging
};

// ── Known boilerplate fingerprint patterns ────────────────────────
const BOILERPLATE_FINGERPRINTS = [
  /This page helps .{3,40} people compare useful brands/,
  /Visit .{3,40} for current .{3,40} offers and availability/,
  /Follow the feeding guide on your chosen formula/,
  /Most .{3,20} dogs? need 2.3 meals per day as adults/,
  /\(varies lbs\)/,
  /\bundefined\b lbs/,
  /\bnull\b lbs/,
  /\{\{[a-z_]+\}\}/,  // unfilled template placeholders
];

// ── Parse frontmatter cheaply (no gray-matter dep needed at audit time) ──
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: raw };
  const fmBlock = raw.slice(4, end);
  const body = raw.slice(end + 4).trim();
  const fm = {};
  for (const line of fmBlock.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val === 'true' ? true : val === 'false' ? false : val;
  }
  return { fm, body };
}

function auditFile(filePath) {
  let raw;
  try { raw = readFileSync(filePath, 'utf-8'); }
  catch { return null; }

  const { fm, body } = parseFrontmatter(raw);

  // Only audit generated posts
  if (!fm.generated) return null;

  const errors = [];

  // 1. Word count — strip markdown links, headings, list bullets, blockquotes
  const cleanBody = body
    .replace(/\[([^\]]+)\]\([^)]+\)(\{[^}]+\})?/g, '$1')  // link → label text
    .replace(/^#{1,6}\s+.+$/gm, '')                          // headings
    .replace(/^[-*]\s+.*/gm, '')                             // list items
    .replace(/^>\s*.*/gm, '')                                // blockquotes
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')               // bold/italic
    .replace(/`[^`]+`/g, '');                                // inline code
  const wordCount = cleanBody.trim().split(/\s+/).filter(w => w.length > 1).length;
  if (wordCount < THRESHOLDS.minBodyWords) {
    errors.push(`THIN: ${wordCount} words (need ≥${THRESHOLDS.minBodyWords})`);
  }

  // 2. Boilerplate fingerprint detection
  let boilerplateHits = 0;
  for (const pattern of BOILERPLATE_FINGERPRINTS) {
    if (pattern.test(body)) boilerplateHits++;
  }
  if (boilerplateHits > THRESHOLDS.boilerplateMax) {
    errors.push(`BOILERPLATE: ${boilerplateHits} template fingerprints matched`);
  }

  // 3. Data token richness — breed-specific numbers (weights, %, time ranges)
  const dataTokens = body.match(
    /\d+[\s–\-–—]+\d+\s*(lbs?|kg|%|minutes?|hours?|weeks?|months?|years?|cups?|inches?|cm)/gi
  ) || [];
  if (dataTokens.length < THRESHOLDS.minDataTokens) {
    errors.push(`LOW DATA: ${dataTokens.length} data tokens (need ≥${THRESHOLDS.minDataTokens})`);
  }

  // 4. Heading structure
  const h2Count = (body.match(/^## /gm) || []).length;
  if (h2Count < THRESHOLDS.minH2Count) {
    errors.push(`FLAT STRUCTURE: ${h2Count} H2 headings (need ≥${THRESHOLDS.minH2Count})`);
  }

  // 5. FAQ presence
  const faqCount = (body.match(/^\*\*(?:Q:|How |What |When |Is |Do |Can |Are )/gm) || []).length;
  if (faqCount < THRESHOLDS.minFaqCount) {
    errors.push(`SPARSE FAQs: ${faqCount} FAQ items (need ≥${THRESHOLDS.minFaqCount})`);
  }

  // 6. Broken placeholder detection (critical — always flag)
  const broken = body.match(/\(varies lbs\)|undefined lbs|null lbs|\{\{[a-z_]+\}\}/g);
  if (broken) {
    errors.push(`BROKEN TEMPLATE: unfilled placeholders: ${[...new Set(broken)].slice(0, 3).join(', ')}`);
  }

  return errors.length > 0 ? { file: filePath, wordCount, errors } : null;
}

// ── Main ──────────────────────────────────────────────────────────
if (!existsSync(GUIDES_DIR)) {
  console.error(`Guides directory not found: ${GUIDES_DIR}`);
  process.exit(1);
}

const files = readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md'));
const failures = [];
let audited = 0;

for (const file of files) {
  const result = auditFile(join(GUIDES_DIR, file));
  audited++;
  if (result) failures.push(result);
}

const pct = failures.length ? ((failures.length / audited) * 100).toFixed(1) : '0.0';
console.log(`\nContent Quality Audit: scanned ${audited} posts, ${failures.length} failed (${pct}%)\n`);

if (failures.length > 0) {
  // Show worst offenders first (most errors)
  failures.sort((a, b) => b.errors.length - a.errors.length);

  const preview = failures.slice(0, 25);
  for (const f of preview) {
    const basename = f.file.split('/').pop();
    console.error(`  ✗ ${basename} (${f.wordCount}w)`);
    f.errors.forEach(e => console.error(`      → ${e}`));
  }
  if (failures.length > 25) {
    console.error(`  ...and ${failures.length - 25} more failures not shown\n`);
  }

  // Error summary by type
  const byType = {};
  for (const f of failures) {
    for (const e of f.errors) {
      const type = e.split(':')[0];
      byType[type] = (byType[type] || 0) + 1;
    }
  }
  console.error('\nFailure breakdown:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.error(`  ${type.padEnd(20)} ${count}`);
  }

  if (process.env.CI || process.env.BLOCK_THIN_CONTENT) {
    console.error('\n❌ Build blocked: set BLOCK_THIN_CONTENT=1 to enforce or unset to warn-only.\n');
    process.exit(1);
  } else {
    console.warn('\n⚠️  Warn-only mode. Set BLOCK_THIN_CONTENT=1 to block builds with thin content.\n');
  }
} else {
  console.log('✅ All generated posts pass quality thresholds.\n');
}
