#!/usr/bin/env node
/**
 * Content Quality Gatekeeper
 *
 * Audits ALL routable guides (not just generated ones). Flags:
 *   - Unfilled template placeholders (*[...)
 *   - Raw tag slugs in body (Choose this if:)
 *   - Thin content (<600 words prose; <400 words structured)
 *   - Boilerplate fingerprint matches
 *   - Low data token density (generated breed guides only)
 *   - Flat heading structure
 *   - Missing FAQ blocks (generated/comparison guides)
 *
 * Run via: node scripts/audit-content-quality.mjs
 * In CI with BLOCK_THIN_CONTENT=1, exits non-zero to block the build.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES_DIR = join(ROOT, 'src/content/guides');

// ── Thresholds ────────────────────────────────────────────────────
const THRESHOLDS = {
  minBodyWordsProse:       600,  // generated prose guides (how-to, health, general, breed)
  minBodyWordsEditorial:   400,  // hand-written editorial guides (focused, quality, not padded)
  minBodyWordsStructured:  400,  // comparison/product-roundup (tables + bullets = denser content)
  minDataTokens:             3,  // breed-specific numbers (generated breed guides only)
  minH2Count:                2,  // min ## headings
  minFaqCount:               2,  // min FAQ pairs (generated/comparison only)
  boilerplateMax:            2,  // max boilerplate fingerprint matches before flagging
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
  const basename = filePath.split('/').pop().replace('.md', '');

  // Skip non-routable guides
  if (fm.noRoute === true || fm.noRoute === 'true') return 'skip';
  // Skip names guides
  if (/^names-for-/.test(basename)) return 'skip';

  const errors = [];
  const isGenerated = fm.generated === true;
  const postType = (fm.postType || 'general').toLowerCase();
  const isStructured = ['comparison', 'product-roundup'].includes(postType);

  // ── CRITICAL checks (ALL guides) ──────────────────────────────
  // Unfilled editorial template placeholders
  if (/\*\[/.test(body)) {
    errors.push('CRITICAL: Unfilled template placeholder (*[...)');
  }
  // Raw tag slugs rendered as body text (bug from old rebuild-guide-money-pages.mjs)
  if (/Choose this if:/.test(body)) {
    errors.push('CRITICAL: Raw tag slugs visible in body (Choose this if:)');
  }

  // ── 1. Word count ─────────────────────────────────────────────
  let cleanBody;
  let minWords;
  if (isGenerated && !isStructured) {
    // Generated prose guides: aggressively strip markdown to detect content padded with bullets/headings.
    cleanBody = body
      .replace(/\[([^\]]+)\]\([^)]+\)(\{[^}]+\})?/g, '$1')
      .replace(/^#{1,6}\s+.+$/gm, '')
      .replace(/^[-*]\s+.*/gm, '')
      .replace(/^>\s*.*/gm, '')
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/`[^`]+`/g, '');
    minWords = THRESHOLDS.minBodyWordsProse;
  } else {
    // Editorial and structured guides: soft strip — remove syntax tokens, keep all text content.
    // Bullets and blockquotes are legitimate content in editorial and comparison guides.
    cleanBody = body
      .replace(/\[([^\]]+)\]\([^)]+\)(\{[^}]+\})?/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\|/g, ' ')              // remove pipe chars from tables, keep cell text
      .replace(/^[-*]\s+/gm, '')        // remove bullet markers, keep content
      .replace(/^>\s*/gm, '')           // remove blockquote markers, keep content
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/`[^`]+`/g, '');
    minWords = isStructured ? THRESHOLDS.minBodyWordsStructured : THRESHOLDS.minBodyWordsEditorial;
  }
  const wordCount = cleanBody.trim().split(/\s+/).filter(w => w.length > 1).length;
  if (wordCount < minWords) {
    errors.push(`THIN: ${wordCount} words (need ≥${minWords})`);
  }

  // ── 2. Boilerplate fingerprint detection (all guides) ─────────
  let boilerplateHits = 0;
  for (const pattern of BOILERPLATE_FINGERPRINTS) {
    if (pattern.test(body)) boilerplateHits++;
  }
  if (boilerplateHits > THRESHOLDS.boilerplateMax) {
    errors.push(`BOILERPLATE: ${boilerplateHits} template fingerprints matched`);
  }

  // ── 3. Data token richness (generated breed guides only) ──────
  // Comparison and product-roundup guides use prices/ratings instead of weight/time ranges.
  // Editorial guides may not have numerical data but are still high quality.
  if (isGenerated && !isStructured) {
    const dataTokens = body.match(
      /\d+[\s–\-–—]+\d+\s*(lbs?|kg|%|minutes?|hours?|weeks?|months?|years?|cups?|inches?|cm)/gi
    ) || [];
    if (dataTokens.length < THRESHOLDS.minDataTokens) {
      errors.push(`LOW DATA: ${dataTokens.length} data tokens (need ≥${THRESHOLDS.minDataTokens})`);
    }
  }

  // ── 4. Heading structure (guides with meaningful word count) ──
  if (wordCount >= 200) {
    const h2Count = (body.match(/^## /gm) || []).length;
    if (h2Count < THRESHOLDS.minH2Count) {
      errors.push(`FLAT STRUCTURE: ${h2Count} H2 headings (need ≥${THRESHOLDS.minH2Count})`);
    }
  }

  // ── 5. FAQ presence ───────────────────────────────────────────
  // Required for: comparison guides (always have FAQ) + generated how-to/health/general guides.
  // Not required for: product-roundup breed guides (not a Q&A format).
  const requiresFaq = postType === 'comparison'
    || (isGenerated && ['how-to', 'health', 'general'].includes(postType));
  if (requiresFaq) {
    const faqCount = (body.match(/^\*\*(?:Q:|How |What |When |Is |Do |Can |Are |Does |Which |Why |Should |Will |My )/gm) || []).length;
    if (faqCount < THRESHOLDS.minFaqCount) {
      errors.push(`SPARSE FAQs: ${faqCount} FAQ items (need ≥${THRESHOLDS.minFaqCount})`);
    }
  }

  // ── 6. Broken template values (legacy placeholder patterns) ───
  const broken = body.match(/\(varies lbs\)|undefined lbs|null lbs|\{\{[a-z_]+\}\}/g);
  if (broken) {
    errors.push(`BROKEN TEMPLATE: unfilled placeholders: ${[...new Set(broken)].slice(0, 3).join(', ')}`);
  }

  return errors.length > 0 ? { file: filePath, wordCount, errors } : 'pass';
}

// ── Main ──────────────────────────────────────────────────────────
if (!existsSync(GUIDES_DIR)) {
  console.error(`Guides directory not found: ${GUIDES_DIR}`);
  process.exit(1);
}

const files = readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md'));
const failures = [];
let audited = 0;
let skipped = 0;

for (const file of files) {
  const result = auditFile(join(GUIDES_DIR, file));
  if (result === 'skip') { skipped++; continue; }
  audited++;
  if (result !== 'pass') failures.push(result);
}

const pct = failures.length ? ((failures.length / audited) * 100).toFixed(1) : '0.0';
console.log(`\nContent Quality Audit: scanned ${audited} guides (${skipped} skipped non-routable), ${failures.length} failed (${pct}%)\n`);

if (failures.length > 0) {
  // Critical failures first, then sort by error count
  const hasCritical = (f) => f.errors.some(e => e.startsWith('CRITICAL'));
  failures.sort((a, b) => {
    if (hasCritical(b) && !hasCritical(a)) return 1;
    if (hasCritical(a) && !hasCritical(b)) return -1;
    return b.errors.length - a.errors.length;
  });

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

  const criticalCount = failures.filter(hasCritical).length;
  if (criticalCount > 0) {
    console.error(`\n🚨 ${criticalCount} CRITICAL failure(s) — these must be fixed before deploy.\n`);
    process.exit(1);
  }

  if (process.env.BLOCK_THIN_CONTENT) {
    console.error('\n❌ Build blocked: unset BLOCK_THIN_CONTENT to run in warn-only mode.\n');
    process.exit(1);
  } else {
    console.warn('\n⚠️  Warn-only mode. Set BLOCK_THIN_CONTENT=1 to block builds with thin content.\n');
  }
} else {
  console.log('✅ All routable guides pass quality thresholds.\n');
}
